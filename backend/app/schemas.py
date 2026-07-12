from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    price: float
    size: str
    ship: str
    sales: int
    tags: list[str]
    image: str


class CartItemChange(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1, le=99)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=0, le=99)


class CartItemOut(BaseModel):
    product: ProductOut
    quantity: int
    subtotal: float


class CartResponse(BaseModel):
    items: list[CartItemOut]
    count: int
    total: float


class OrderCreate(BaseModel):
    recipient_name: str
    phone: str
    address: str
    payment_method: str = Field(pattern='^(alipay|wechat|card)$')


class OrderItemOut(BaseModel):
    product_id: str
    product_name: str
    product_size: str
    product_ship: str
    image: str
    unit_price: float
    quantity: int


class OrderOut(BaseModel):
    order_no: str
    status: str
    payment_method: str
    recipient_name: str
    phone: str
    address: str
    goods_total: float
    shipping_fee: float
    discount_total: float
    payable_total: float
    created_at: datetime
    items: list[OrderItemOut]
