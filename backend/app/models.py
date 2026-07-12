from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    cart_items: Mapped[list['CartItem']] = relationship(back_populates='user', cascade='all, delete-orphan')
    orders: Mapped[list['Order']] = relationship(back_populates='user', cascade='all, delete-orphan')


class Product(Base):
    __tablename__ = 'products'

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    price: Mapped[float] = mapped_column(Float)
    size: Mapped[str] = mapped_column(String(20))
    ship: Mapped[str] = mapped_column(String(20))
    sales: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    image: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    cart_items: Mapped[list['CartItem']] = relationship(back_populates='product')


class CartItem(Base):
    __tablename__ = 'cart_items'
    __table_args__ = (UniqueConstraint('user_id', 'product_id', name='uq_cart_user_product'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey('products.id', ondelete='CASCADE'), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped['User'] = relationship(back_populates='cart_items')
    product: Mapped['Product'] = relationship(back_populates='cart_items')


class Order(Base):
    __tablename__ = 'orders'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    order_no: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default='paid')
    payment_method: Mapped[str] = mapped_column(String(20))
    recipient_name: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(30))
    address: Mapped[str] = mapped_column(Text)
    goods_total: Mapped[float] = mapped_column(Float)
    shipping_fee: Mapped[float] = mapped_column(Float)
    discount_total: Mapped[float] = mapped_column(Float)
    payable_total: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped['User'] = relationship(back_populates='orders')
    items: Mapped[list['OrderItem']] = relationship(back_populates='order', cascade='all, delete-orphan')


class OrderItem(Base):
    __tablename__ = 'order_items'

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id', ondelete='CASCADE'), index=True)
    product_id: Mapped[str] = mapped_column(String(20))
    product_name: Mapped[str] = mapped_column(String(180))
    product_size: Mapped[str] = mapped_column(String(20))
    product_ship: Mapped[str] = mapped_column(String(20))
    image: Mapped[str] = mapped_column(String(120))
    unit_price: Mapped[float] = mapped_column(Float)
    quantity: Mapped[int] = mapped_column(Integer)

    order: Mapped['Order'] = relationship(back_populates='items')
