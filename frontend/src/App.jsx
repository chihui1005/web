import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
const LS_TOKEN = 'pikachu_shop_token_v1';
const EMPTY_CART = { items: [], count: 0, total: 0 };
const DEFAULT_PAY_METHOD = 'alipay';
const EMPTY_CHECKOUT_FORM = { recipient_name: '', phone: '', address: '' };
const DEFAULT_AUTH_FORM = { username: 'ash', password: 'pikachu123' };

function assetPath(filename) {
  return `${import.meta.env.BASE_URL}assets/${filename}`;
}

function loadToken() {
  try {
    return localStorage.getItem(LS_TOKEN) || '';
  } catch {
    return '';
  }
}

function money(value) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function getSortedProducts({ products, query, size, ship, price, sort }) {
  const normalizedQuery = query.trim().toLowerCase();
  const list = products.filter((product) => {
    if (normalizedQuery && !product.name.toLowerCase().includes(normalizedQuery)) return false;
    if (size !== 'all' && product.size !== size) return false;
    if (ship !== 'all' && product.ship !== ship) return false;
    if (price !== 'all') {
      const [min, max] = price.split('-').map(Number);
      if (!(product.price >= min && product.price <= max)) return false;
    }
    return true;
  });

  if (sort === 'sales') return list.sort((a, b) => b.sales - a.sales);
  if (sort === 'priceAsc') return list.sort((a, b) => a.price - b.price);
  if (sort === 'priceDesc') return list.sort((a, b) => b.price - a.price);

  return list.sort((a, b) => {
    const hotDelta = Number(b.tags.includes('hot')) - Number(a.tags.includes('hot'));
    if (hotDelta) return hotDelta;
    const newDelta = Number(b.tags.includes('new')) - Number(a.tags.includes('new'));
    if (newDelta) return newDelta;
    return b.sales - a.sales || a.price - b.price;
  });
}

async function request(path, options = {}, token = '') {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = '请求失败';
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
    } catch {
      detail = response.statusText || detail;
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

function ProductImage({ src, alt, className = 'thumb' }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`${className}${failed ? ' noimg' : ''}`} role="img" aria-label={alt}>
      {!failed && <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    </div>
  );
}

function ProductCard({ product, disabled, onAdd, onBuy }) {
  return (
    <article className="card">
      <ProductImage src={assetPath(product.image)} alt="皮卡丘玩偶商品图" />
      <div className="cbd">
        <div className="name">{product.name}</div>
        <div className="tags">
          {product.tags.map((tag) => (
            <span key={tag} className={`tag ${tag}`}>
              {tag === 'hot' ? '热卖' : tag === 'new' ? '新品' : tag}
            </span>
          ))}
          <span className="tag">{product.size}</span>
          <span className="tag">发货{product.ship}</span>
        </div>
        <div className="meta">
          <div className="price"><small>¥</small>{money(product.price)}</div>
          <div className="sub">月销 {product.sales.toLocaleString()}</div>
        </div>
        <div className="actions">
          <button className="btn primary" type="button" disabled={disabled} onClick={() => onBuy(product.id)}>立即购买</button>
          <button className="btn brand" type="button" disabled={disabled} onClick={() => onAdd(product.id)}>加入购物车</button>
        </div>
      </div>
    </article>
  );
}

function SegmentedFilter({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((option) => (
        <button key={option.value} type="button" className={value === option.value ? 'on' : ''} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CartDrawer({ open, cart, onClose, onClear, onCheckout, onChangeQty, onRemove, loggedIn }) {
  return (
    <aside className={`drawer${open ? ' show' : ''}`} aria-label="购物车抽屉">
      <div className="drawer-hd" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <b>购物车</b>
          <div className="hint">已选 <span>{cart.count}</span> 件</div>
        </div>
        <button className="close" type="button" aria-label="关闭" onClick={onClose}>×</button>
      </div>
      <div className="drawer-bd">
        {!loggedIn && <div className="empty-state">登录后可查看和持久化购物车。</div>}
        {loggedIn && !cart.items.length && <div className="empty-state">购物车还是空的，去挑点皮卡丘吧。</div>}
        {cart.items.map((item) => (
          <div className="cart-item" key={item.product.id}>
            <ProductImage src={assetPath(item.product.image)} alt="商品缩略图" className="mini" />
            <div>
              <div className="cart-name">{item.product.name}</div>
              <div className="cart-meta">
                <div className="sub"><span className="item-price">¥{money(item.product.price)}</span> / 件</div>
                <button className="linkbtn" type="button" onClick={() => onRemove(item.product.id)}>删除</button>
              </div>
              <div className="cart-meta cart-qty-row">
                <div className="qty" aria-label="数量">
                  <button type="button" onClick={() => onChangeQty(item.product.id, item.quantity - 1)}>-</button>
                  <input
                    value={item.quantity}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(event) => onChangeQty(item.product.id, event.target.value)}
                  />
                  <button type="button" onClick={() => onChangeQty(item.product.id, item.quantity + 1)}>+</button>
                </div>
                <div className="sub">小计 <b>¥{money(item.subtotal)}</b></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="drawer-ft">
        <div className="sumrow">
          <span>合计</span>
          <div><small>¥</small><b>{money(cart.total)}</b></div>
        </div>
        <div className="ft-actions">
          <button className="btn" type="button" disabled={!cart.count} onClick={onClear}>清空</button>
          <button className="btn brand" type="button" disabled={!cart.count} onClick={onCheckout}>去结算</button>
        </div>
      </div>
    </aside>
  );
}

function OrdersDrawer({ open, orders, user, onClose, onContinueShopping }) {
  return (
    <aside className={`drawer orders-drawer${open ? ' show' : ''}`} aria-label="订单抽屉">
      <div className="drawer-hd" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <b>我的订单</b>
          <div className="hint">共 <span>{user ? orders.length : 0}</span> 单</div>
        </div>
        <button className="close" type="button" aria-label="关闭" onClick={onClose}>×</button>
      </div>
      <div className="drawer-bd">
        <OrdersSection orders={orders} user={user} />
      </div>
      <div className="drawer-ft">
        <div className="ft-actions">
          <button className="btn brand" type="button" onClick={onContinueShopping}>继续购物</button>
        </div>
      </div>
    </aside>
  );
}

function CheckoutModal({ open, cart, pay, form, onPayChange, onFormChange, onClose, onBackToCart, onSubmit, submitting }) {
  const goods = cart.total;
  const ship = goods >= 99 || goods === 0 ? 0 : 8;
  const discount = goods >= 199 ? 20 : 0;
  const payable = Math.max(0, goods + ship - discount);

  return (
    <div className={`modal${open ? ' show' : ''}`}>
      <div className="box">
        <div className="modal-hd" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <b>确认订单</b>
          <button className="close" type="button" aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <div className="modal-bd">
          <section>
            <div className="field">
              <label>收货信息</label>
              <div className="formgrid">
                <div className="field">
                  <label className="hint" htmlFor="checkout-recipient-name">收货人</label>
                  <input id="checkout-recipient-name" className="ctrl" value={form.recipient_name} placeholder="例如：张三" onChange={(event) => onFormChange('recipient_name', event.target.value)} />
                </div>
                <div className="field">
                  <label className="hint" htmlFor="checkout-phone">手机号</label>
                  <input id="checkout-phone" className="ctrl" value={form.phone} placeholder="例如：138****8888" onChange={(event) => onFormChange('phone', event.target.value)} />
                </div>
                <div className="field full">
                  <label className="hint" htmlFor="checkout-address">收货地址</label>
                  <input id="checkout-address" className="ctrl" value={form.address} placeholder="例如：北京市朝阳区某某路 88 号" onChange={(event) => onFormChange('address', event.target.value)} />
                </div>
              </div>
            </div>

            <div className="field pay-field">
              <label>支付方式</label>
              <div className="paymethods">
                {[
                  ['alipay', '支付宝（模拟）'],
                  ['wechat', '微信支付（模拟）'],
                  ['card', '银行卡（模拟）'],
                ].map(([value, label]) => (
                  <button key={value} type="button" className={pay === value ? 'on' : ''} onClick={() => onPayChange(value)}>{label}</button>
                ))}
              </div>
            </div>

            <div className="notice">
              <b>提示：</b>该页面用于 MVP 演示，提交后会创建真实数据库订单记录，但不会产生真实支付交易。
            </div>
          </section>

          <aside className="order">
            <h3>订单信息</h3>
            <div className="line"><span>商品金额</span><b>¥{money(goods)}</b></div>
            <div className="line"><span>运费</span><b>¥{money(ship)}</b></div>
            <div className="line"><span>优惠</span><b>-¥{money(discount)}</b></div>
            <div className="line order-pay"><span>应付</span><b>¥{money(payable)}</b></div>
          </aside>
        </div>
        <div className="modal-ft">
          <div className="hint">下单后可在本页“我的订单”看到记录</div>
          <div className="modal-actions">
            <button className="btn" type="button" onClick={onBackToCart}>返回购物车</button>
            <button className="btn brand" type="button" disabled={submitting} onClick={onSubmit}>{submitting ? '提交中...' : '提交并支付'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ authForm, authLoading, onAuthChange, onLogin }) {
  return (
    <div className="wrap login-shell">
      <section className="login-hero">
        <h1>登录后进入皮卡丘玩偶旗舰店</h1>
      </section>

      <section className="panel login-panel">
        <div className="panel-hd">
          <div>
            <div className="t">账号登录</div>
          </div>
          <span className="status-pill">未登录</span>
        </div>
        <div className="panel-bd stack">
          <div className="field">
            <label htmlFor="login-username">用户名</label>
            <input id="login-username" className="ctrl" value={authForm.username} onChange={(event) => onAuthChange('username', event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-password">密码</label>
            <input id="login-password" className="ctrl" type="password" value={authForm.password} onChange={(event) => onAuthChange('password', event.target.value)} />
          </div>
          <button className="btn brand" type="button" disabled={authLoading} onClick={onLogin}>{authLoading ? '登录中...' : '登录'}</button>
          <div className="tipbox">测试账号：ash / pikachu123，misty / togepi123</div>
        </div>
      </section>
    </div>
  );
}

function OrdersSection({ orders, user }) {
  return (
    <section className="orders-section">
      <div className="section-title">
        <h2>我的订单</h2>
        <span className="pill">{user ? `共 ${orders.length} 单` : '登录后可查看'}</span>
      </div>
      {!user && <div className="empty-state">登录后，结算生成的订单会出现在这里。</div>}
      {user && !orders.length && <div className="empty-state">还没有订单，先把喜欢的皮卡丘加入购物车吧。</div>}
      <div className="orders-grid">
        {orders.map((order) => (
          <article key={order.order_no} className="order-card">
            <div className="order-head">
              <div>
                <b>{order.order_no}</b>
                <span>{new Date(order.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <span className="status-pill ok">{order.status === 'paid' ? '已支付' : order.status}</span>
            </div>
            <div className="order-items">
              {order.items.map((item) => (
                <div className="order-item" key={`${order.order_no}-${item.product_id}`}>
                  <ProductImage src={assetPath(item.image)} alt="订单商品图" className="micro" />
                  <div>
                    <div className="cart-name">{item.product_name}</div>
                    <div className="sub">{item.product_size} / 发货{item.product_ship} / x{item.quantity}</div>
                  </div>
                  <b>¥{money(item.unit_price * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="order-foot">
              <span>收货：{order.recipient_name} · {order.phone}</span>
              <b>实付 ¥{money(order.payable_total)}</b>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('all');
  const [ship, setShip] = useState('all');
  const [price, setPrice] = useState('all');
  const [sort, setSort] = useState('smart');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(EMPTY_CART);
  const [orders, setOrders] = useState([]);
  const [pay, setPay] = useState(DEFAULT_PAY_METHOD);
  const [form, setForm] = useState(EMPTY_CHECKOUT_FORM);
  const [authForm, setAuthForm] = useState(DEFAULT_AUTH_FORM);
  const [token, setToken] = useState(() => loadToken());
  const [user, setUser] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [mutatingCart, setMutatingCart] = useState(false);

  const list = useMemo(() => getSortedProducts({ products, query, size, ship, price, sort }), [products, query, size, ship, price, sort]);

  useEffect(() => {
    try {
      if (token) localStorage.setItem(LS_TOKEN, token);
      else localStorage.removeItem(LS_TOKEN);
    } catch {
      return undefined;
    }
    return undefined;
  }, [token]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setBooting(true);
      try {
        const nextProducts = await request('/products');
        if (!active) return;
        setProducts(nextProducts);

        if (!token) {
          setUser(null);
          setCart(EMPTY_CART);
          setOrders([]);
          setPay(DEFAULT_PAY_METHOD);
          setForm(EMPTY_CHECKOUT_FORM);
          setCartOpen(false);
          setOrdersOpen(false);
          return;
        }

        const [nextUser, nextCart, nextOrders] = await Promise.all([
          request('/auth/me', {}, token),
          request('/cart', {}, token),
          request('/orders', {}, token),
        ]);
        if (!active) return;
        setUser(nextUser);
        setCart(nextCart);
        setOrders(nextOrders);
      } catch (error) {
        if (!active) return;
        if (error.status === 401) {
          setToken('');
          setUser(null);
          setCart(EMPTY_CART);
          setOrders([]);
          setPay(DEFAULT_PAY_METHOD);
          setForm(EMPTY_CHECKOUT_FORM);
          setCartOpen(false);
          setOrdersOpen(false);
          setModalOpen(false);
          setToast('登录状态已失效，请重新登录');
        } else {
          setToast(error.message || '加载失败');
        }
      } finally {
        if (active) setBooting(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [token]);

  const showToast = (message) => setToast(message);

  const requireLogin = (message = '请先登录') => {
    if (token) return true;
    showToast(message);
    return false;
  };

  const search = () => setQuery(queryInput.trim());

  const reset = () => {
    setQueryInput('');
    setQuery('');
    setSize('all');
    setShip('all');
    setPrice('all');
    setSort('smart');
    showToast('已重置筛选');
  };

  const syncCart = async (method, path, body, successMessage) => {
    if (!requireLogin('请先登录后再操作购物车')) return null;
    setMutatingCart(true);
    try {
      const nextCart = await request(path, { method, body: body ? JSON.stringify(body) : undefined }, token);
      setCart(nextCart);
      if (successMessage) showToast(successMessage);
      return nextCart;
    } catch (error) {
      showToast(error.message || '购物车操作失败');
      return null;
    } finally {
      setMutatingCart(false);
    }
  };

  const addToCart = async (productId, qty = 1) => {
    const nextCart = await syncCart('POST', '/cart/items', { product_id: productId, quantity: qty }, '已加入购物车');
    return Boolean(nextCart);
  };

  const changeQty = async (productId, value) => {
    let quantity = Number.parseInt(value, 10);
    if (Number.isNaN(quantity) || quantity < 0) quantity = 0;
    if (quantity > 99) quantity = 99;
    await syncCart('PATCH', `/cart/items/${productId}`, { quantity }, quantity === 0 ? '已删除商品' : '已更新数量');
  };

  const removeItem = async (productId) => {
    await syncCart('DELETE', `/cart/items/${productId}`, undefined, '已删除商品');
  };

  const clearCart = async () => {
    if (!cart.items.length) return;
    setMutatingCart(true);
    try {
      for (const item of cart.items) {
        await request(`/cart/items/${item.product.id}`, { method: 'DELETE' }, token);
      }
      setCart(EMPTY_CART);
      showToast('购物车已清空');
    } catch (error) {
      showToast(error.message || '清空购物车失败');
    } finally {
      setMutatingCart(false);
    }
  };

  const login = async () => {
    setAuthLoading(true);
    try {
      const payload = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: authForm.username.trim(), password: authForm.password }),
      });
      setToken(payload.access_token);
      setUser(payload.user);
      setCart(EMPTY_CART);
      setOrders([]);
      setPay(DEFAULT_PAY_METHOD);
      setForm(EMPTY_CHECKOUT_FORM);
      setCartOpen(false);
      setOrdersOpen(false);
      setModalOpen(false);
      setAuthForm((current) => ({ ...current, password: '' }));
      showToast(`欢迎回来，${payload.user.display_name}`);
    } catch (error) {
      showToast(error.message || '登录失败');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setCart(EMPTY_CART);
    setOrders([]);
    setPay(DEFAULT_PAY_METHOD);
    setForm(EMPTY_CHECKOUT_FORM);
    setModalOpen(false);
    setCartOpen(false);
    setOrdersOpen(false);
    setAuthForm((current) => ({ username: current.username || DEFAULT_AUTH_FORM.username, password: '' }));
    showToast('已退出登录');
  };

  const submitPayment = async () => {
    if (!requireLogin('请先登录后再下单')) return;
    if (!cart.count) {
      showToast('购物车为空');
      return;
    }
    if (!form.recipient_name.trim() || !form.phone.trim() || !form.address.trim()) {
      showToast('请完整填写收货信息');
      return;
    }

    setSubmittingOrder(true);
    try {
      const order = await request('/orders', { method: 'POST', body: JSON.stringify({ ...form, payment_method: pay }) }, token);
      setOrders((current) => [order, ...current]);
      setCart(EMPTY_CART);
      setPay(DEFAULT_PAY_METHOD);
      setForm(EMPTY_CHECKOUT_FORM);
      setModalOpen(false);
      setCartOpen(false);
      setOrdersOpen(true);
      showToast(`支付成功（模拟）｜订单号 ${order.order_no}`);
    } catch (error) {
      showToast(error.message || '下单失败');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const overlayOpen = cartOpen || ordersOpen || modalOpen;

  const openOrdersDrawer = () => {
    if (!requireLogin('请先登录后再查看订单')) return;
    setCartOpen(false);
    setModalOpen(false);
    setOrdersOpen(true);
  };

  const openCartDrawer = () => {
    if (!requireLogin('请先登录后再查看购物车')) return;
    setOrdersOpen(false);
    setCartOpen(true);
  };

  if (!user) {
    return (
      <>
        <div className="topbar">
          <div className="inner">
            <div className="logo">
              <div className="logo-badge">P</div>
              <div className="logo-title">
                <b>皮卡丘玩偶旗舰店</b>
              </div>
            </div>

            <div className="top-actions">
              <div className="account-chip">未登录</div>
            </div>
          </div>
        </div>

        <LoginScreen
          authForm={authForm}
          authLoading={authLoading}
          onAuthChange={(field, value) => setAuthForm((current) => ({ ...current, [field]: value }))}
          onLogin={login}
        />

        <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="inner">
          <div className="logo">
            <div className="logo-badge">P</div>
            <div className="logo-title">
              <b>皮卡丘玩偶旗舰店</b>
            </div>
          </div>

          <div className="search" role="search">
            <input
              type="search"
              placeholder="搜“皮卡丘 玩偶 80cm”"
              autoComplete="off"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') search();
              }}
            />
            <button className="chip" type="button" onClick={search}>搜索</button>
          </div>

          <div className="top-actions">
            <button className="account-chip account-chip-button" type="button" aria-label={`当前登录用户：${user.display_name}，点击退出登录`} onClick={logout}>{`你好，${user.display_name}`}</button>
            <button
              className={`iconbtn topnavbtn${ordersOpen ? ' active' : ''}`}
              type="button"
              aria-label="订单"
              onClick={openOrdersDrawer}
            >
              订单
              <span className="badge ghost">{orders.length}</span>
            </button>
            <button
              className={`iconbtn topnavbtn${cartOpen ? ' active' : ''}`}
              type="button"
              aria-label="购物车"
              onClick={openCartDrawer}
            >
              购物车
              <span className="badge">{cart.count}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="wrap app-shell app-shell-logged-in">
        <aside className="sidebar-stack">
          <section className="panel">
            <div className="panel-hd">
              <div>
                <div className="t">筛选</div>
                <div className="s">按条件快速筛选商品</div>
              </div>
              <button className="btn" type="button" onClick={reset}>重置</button>
            </div>
            <div className="panel-bd">
              <div className="filters">
                <div className="field">
                  <label>价格区间</label>
                  <select className="ctrl" value={price} onChange={(event) => setPrice(event.target.value)}>
                    <option value="all">全部</option>
                    <option value="0-49">¥0 - ¥49</option>
                    <option value="50-99">¥50 - ¥99</option>
                    <option value="100-199">¥100 - ¥199</option>
                    <option value="200-9999">¥200+</option>
                  </select>
                </div>

                <div className="field">
                  <label>规格</label>
                  <SegmentedFilter
                    value={size}
                    onChange={setSize}
                    options={[
                      { value: 'all', label: '全部' },
                      { value: '20cm', label: '20cm' },
                      { value: '40cm', label: '40cm' },
                      { value: '60cm', label: '60cm' },
                      { value: '80cm', label: '80cm' },
                    ]}
                  />
                </div>

                <div className="field">
                  <label>发货</label>
                  <SegmentedFilter
                    value={ship}
                    onChange={setShip}
                    options={[
                      { value: 'all', label: '全部' },
                      { value: '24h', label: '24小时内' },
                      { value: '48h', label: '48小时内' },
                    ]}
                  />
                </div>

                <div className="kpi">
                  <div className="box">
                    <b>{list.length}</b>
                    <span>当前匹配商品</span>
                  </div>
                  <div className="box">
                    <b>{cart.count}</b>
                    <span>购物车件数</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <main className="main-stack">
          <section className="panel">
            <div className="panel-hd">
              <div className="listbar">
                <div className="title">
                  <h1>皮卡丘玩偶热卖</h1>
                  <span className="pill">{query ? `搜索：${query}` : '全部商品'}</span>
                  {booting && <span className="pill muted">加载中</span>}
                </div>
                <div className="sort">
                  <span className="hint">排序</span>
                  <select value={sort} aria-label="排序" onChange={(event) => setSort(event.target.value)}>
                    <option value="smart">综合</option>
                    <option value="sales">销量优先</option>
                    <option value="priceAsc">价格从低到高</option>
                    <option value="priceDesc">价格从高到低</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="panel-bd">
              <div className="grid">
                {list.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    disabled={mutatingCart || submittingOrder}
                    onAdd={addToCart}
                    onBuy={async (productId) => {
                      const added = await addToCart(productId);
                      if (added) {
                        setOrdersOpen(false);
                        setCartOpen(true);
                        setModalOpen(true);
                      }
                    }}
                  />
                ))}
              </div>
              {!booting && !list.length && <div className="empty-state">没有找到匹配商品，试试清空筛选或换个关键词。</div>}
            </div>
          </section>
        </main>
      </div>

      <div
        className={`overlay${overlayOpen ? ' show' : ''}`}
        onClick={() => {
          setModalOpen(false);
          setCartOpen(false);
          setOrdersOpen(false);
        }}
      />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        loggedIn={Boolean(user)}
        onClose={() => setCartOpen(false)}
        onClear={clearCart}
        onCheckout={() => setModalOpen(true)}
        onChangeQty={changeQty}
        onRemove={removeItem}
      />

      <OrdersDrawer
        open={ordersOpen}
        orders={orders}
        user={user}
        onClose={() => setOrdersOpen(false)}
        onContinueShopping={() => setOrdersOpen(false)}
      />

      <CheckoutModal
        open={modalOpen}
        cart={cart}
        pay={pay}
        form={form}
        submitting={submittingOrder}
        onPayChange={setPay}
        onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
        onClose={() => setModalOpen(false)}
        onBackToCart={() => {
          setModalOpen(false);
          setCartOpen(true);
        }}
        onSubmit={submitPayment}
      />

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  );
}