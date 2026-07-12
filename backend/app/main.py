from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import secrets

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .auth import create_access_token, hash_password, verify_password
from .database import Base, SessionLocal, engine
from .deps import get_current_user, get_db
from .models import CartItem, Order, OrderItem, Product, User
from .schemas import CartItemChange, CartItemOut, CartItemUpdate, CartResponse, LoginRequest, OrderCreate, OrderItemOut, OrderOut, ProductOut, TokenResponse, UserOut


SEED_USERS = [
    {
        'username': 'ash',
        'display_name': '小智',
        'password': 'pikachu123',
    },
    {
        'username': 'misty',
        'display_name': '小霞',
        'password': 'togepi123',
    },
]

SEED_PRODUCTS = [
    {'id': 'p1', 'name': '皮卡丘毛绒玩偶 20cm｜软萌小挂件', 'price': 29.9, 'size': '20cm', 'ship': '24h', 'sales': 23841, 'tags': ['new'], 'image': 'pikachu-01.jpg'},
    {'id': 'p2', 'name': '皮卡丘毛绒玩偶 40cm｜抱抱款', 'price': 69.0, 'size': '40cm', 'ship': '24h', 'sales': 16890, 'tags': ['hot'], 'image': 'pikachu-02.jpg'},
    {'id': 'p3', 'name': '皮卡丘毛绒玩偶 60cm｜大号靠枕', 'price': 129.0, 'size': '60cm', 'ship': '48h', 'sales': 9421, 'tags': ['hot'], 'image': 'pikachu-03.jpg'},
    {'id': 'p4', 'name': '皮卡丘玩偶 80cm｜超大抱枕（礼盒装）', 'price': 219.0, 'size': '80cm', 'ship': '48h', 'sales': 4210, 'tags': ['hot', 'new'], 'image': 'pikachu-04.jpg'},
    {'id': 'p5', 'name': '皮卡丘玩偶 40cm｜带围巾限定款', 'price': 79.9, 'size': '40cm', 'ship': '48h', 'sales': 8021, 'tags': ['new'], 'image': 'pikachu-05.jpg'},
    {'id': 'p6', 'name': '皮卡丘玩偶 60cm｜生日礼物套装（含贺卡）', 'price': 149.0, 'size': '60cm', 'ship': '24h', 'sales': 6238, 'tags': ['hot'], 'image': 'pikachu-06.jpg'},
    {'id': 'p7', 'name': '皮卡丘玩偶 20cm｜钥匙扣版（双只装）', 'price': 39.9, 'size': '20cm', 'ship': '24h', 'sales': 19330, 'tags': ['hot'], 'image': 'pikachu-07.jpg'},
    {'id': 'p8', 'name': '皮卡丘玩偶 80cm｜毛绒枕（加厚）', 'price': 199.0, 'size': '80cm', 'ship': '48h', 'sales': 5120, 'tags': [], 'image': 'pikachu-08.jpg'},
]

app = FastAPI(title='Pikachu Shop API', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def round_money(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def serialize_product(product: Product) -> ProductOut:
    return ProductOut.model_validate(product)


def build_cart_response(items: list[CartItem]) -> CartResponse:
    payload_items: list[CartItemOut] = []
    count = 0
    total = 0.0
    for item in items:
        subtotal = round_money(item.quantity * item.product.price)
        payload_items.append(
            CartItemOut(
                product=serialize_product(item.product),
                quantity=item.quantity,
                subtotal=subtotal,
            )
        )
        count += item.quantity
        total += subtotal
    return CartResponse(items=payload_items, count=count, total=round_money(total))


def build_order_response(order: Order) -> OrderOut:
    return OrderOut(
        order_no=order.order_no,
        status=order.status,
        payment_method=order.payment_method,
        recipient_name=order.recipient_name,
        phone=order.phone,
        address=order.address,
        goods_total=order.goods_total,
        shipping_fee=order.shipping_fee,
        discount_total=order.discount_total,
        payable_total=order.payable_total,
        created_at=order.created_at,
        items=[
            OrderItemOut(
                product_id=item.product_id,
                product_name=item.product_name,
                product_size=item.product_size,
                product_ship=item.product_ship,
                image=item.image,
                unit_price=item.unit_price,
                quantity=item.quantity,
            )
            for item in order.items
        ],
    )


def get_user_cart_items(db: Session, user_id: int) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .where(CartItem.user_id == user_id)
            .options(selectinload(CartItem.product))
            .order_by(CartItem.created_at.desc())
        )
    )


def seed_database() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        existing_usernames = set(db.scalars(select(User.username)).all())
        for seed_user in SEED_USERS:
            if seed_user['username'] not in existing_usernames:
                db.add(
                    User(
                        username=seed_user['username'],
                        display_name=seed_user['display_name'],
                        password_hash=hash_password(seed_user['password']),
                    )
                )
        existing_ids = set(db.scalars(select(Product.id)).all())
        for product_data in SEED_PRODUCTS:
            if product_data['id'] not in existing_ids:
                db.add(Product(**product_data))
        db.commit()


@app.on_event('startup')
def on_startup() -> None:
    seed_database()


@app.get('/api/health')
def healthcheck() -> dict[str, str]:
    return {'status': 'ok'}


@app.post('/api/auth/login', response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.username == payload.username.strip()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='用户名或密码错误')
    return TokenResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@app.get('/api/auth/me', response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@app.get('/api/products', response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)) -> list[ProductOut]:
    products = list(db.scalars(select(Product).order_by(Product.sales.desc(), Product.price.asc())))
    return [serialize_product(product) for product in products]


@app.get('/api/cart', response_model=CartResponse)
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartResponse:
    return build_cart_response(get_user_cart_items(db, current_user.id))


@app.post('/api/cart/items', response_model=CartResponse)
def add_cart_item(payload: CartItemChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartResponse:
    product = db.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='商品不存在')

    cart_item = db.scalar(
        select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == payload.product_id)
    )
    if cart_item is None:
        db.add(CartItem(user_id=current_user.id, product_id=payload.product_id, quantity=payload.quantity))
    else:
        cart_item.quantity = min(99, cart_item.quantity + payload.quantity)
    db.commit()
    return build_cart_response(get_user_cart_items(db, current_user.id))


@app.patch('/api/cart/items/{product_id}', response_model=CartResponse)
def update_cart_item(product_id: str, payload: CartItemUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartResponse:
    cart_item = db.scalar(
        select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == product_id)
    )
    if cart_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='购物车商品不存在')

    if payload.quantity == 0:
        db.delete(cart_item)
    else:
        cart_item.quantity = payload.quantity
    db.commit()
    return build_cart_response(get_user_cart_items(db, current_user.id))


@app.delete('/api/cart/items/{product_id}', response_model=CartResponse)
def delete_cart_item(product_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CartResponse:
    cart_item = db.scalar(
        select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == product_id)
    )
    if cart_item is not None:
        db.delete(cart_item)
        db.commit()
    return build_cart_response(get_user_cart_items(db, current_user.id))


@app.post('/api/orders', response_model=OrderOut)
def create_order(payload: OrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> OrderOut:
    cart_items = get_user_cart_items(db, current_user.id)
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='购物车为空')

    recipient_name = payload.recipient_name.strip()
    phone = payload.phone.strip()
    address = payload.address.strip()
    if not recipient_name or not phone or not address:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='请完整填写收货信息')

    goods_total = round_money(sum(item.quantity * item.product.price for item in cart_items))
    shipping_fee = 0.0 if goods_total >= 99 or goods_total == 0 else 8.0
    discount_total = 20.0 if goods_total >= 199 else 0.0
    payable_total = round_money(max(0.0, goods_total + shipping_fee - discount_total))
    order = Order(
        user_id=current_user.id,
        order_no=f"MO{datetime.now().strftime('%Y%m%d%H%M%S')}{secrets.randbelow(9000) + 1000}",
        status='paid',
        payment_method=payload.payment_method,
        recipient_name=recipient_name,
        phone=phone,
        address=address,
        goods_total=goods_total,
        shipping_fee=shipping_fee,
        discount_total=discount_total,
        payable_total=payable_total,
    )
    db.add(order)
    db.flush()

    for cart_item in cart_items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=cart_item.product.id,
                product_name=cart_item.product.name,
                product_size=cart_item.product.size,
                product_ship=cart_item.product.ship,
                image=cart_item.product.image,
                unit_price=cart_item.product.price,
                quantity=cart_item.quantity,
            )
        )
        db.delete(cart_item)

    db.commit()
    db.refresh(order)
    order = db.scalar(select(Order).where(Order.id == order.id).options(selectinload(Order.items)))
    return build_order_response(order)


@app.get('/api/orders', response_model=list[OrderOut])
def list_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[OrderOut]:
    orders = list(
        db.scalars(
            select(Order)
            .where(Order.user_id == current_user.id)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
    )
    return [build_order_response(order) for order in orders]
