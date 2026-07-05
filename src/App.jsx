import { useEffect, useMemo, useState } from 'react';

function assetPath(filename) {
  return `${import.meta.env.BASE_URL}assets/${filename}`;
}

const PRODUCTS = [
  { id: 'p1', name: '皮卡丘毛绒玩偶 20cm｜软萌小挂件', price: 29.9, size: '20cm', ship: '24h', sales: 23841, tags: ['new'], img: assetPath('pikachu-01.jpg') },
  { id: 'p2', name: '皮卡丘毛绒玩偶 40cm｜抱抱款', price: 69.0, size: '40cm', ship: '24h', sales: 16890, tags: ['hot'], img: assetPath('pikachu-02.jpg') },
  { id: 'p3', name: '皮卡丘毛绒玩偶 60cm｜大号靠枕', price: 129.0, size: '60cm', ship: '48h', sales: 9421, tags: ['hot'], img: assetPath('pikachu-03.jpg') },
  { id: 'p4', name: '皮卡丘玩偶 80cm｜超大抱枕（礼盒装）', price: 219.0, size: '80cm', ship: '48h', sales: 4210, tags: ['hot', 'new'], img: assetPath('pikachu-04.jpg') },
  { id: 'p5', name: '皮卡丘玩偶 40cm｜带围巾限定款', price: 79.9, size: '40cm', ship: '48h', sales: 8021, tags: ['new'], img: assetPath('pikachu-05.jpg') },
  { id: 'p6', name: '皮卡丘玩偶 60cm｜生日礼物套装（含贺卡）', price: 149.0, size: '60cm', ship: '24h', sales: 6238, tags: ['hot'], img: assetPath('pikachu-06.jpg') },
  { id: 'p7', name: '皮卡丘玩偶 20cm｜钥匙扣版（双只装）', price: 39.9, size: '20cm', ship: '24h', sales: 19330, tags: ['hot'], img: assetPath('pikachu-07.jpg') },
  { id: 'p8', name: '皮卡丘玩偶 80cm｜毛绒枕（加厚）', price: 199.0, size: '80cm', ship: '48h', sales: 5120, tags: [], img: assetPath('pikachu-08.jpg') },
];

const LS_CART = 'pikachu_shop_cart_v1';
const LS_RECENT = 'pikachu_shop_recent_v1';

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(value) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function cartCount(cart) {
  return Object.values(cart).reduce((sum, count) => sum + count, 0);
}

function cartTotal(cart) {
  return Object.entries(cart).reduce((sum, [productId, qty]) => {
    const product = PRODUCTS.find((item) => item.id === productId);
    return product ? sum + product.price * qty : sum;
  }, 0);
}

function getSortedProducts({ query, size, ship, price, sort }) {
  const normalizedQuery = query.trim().toLowerCase();
  const list = PRODUCTS.filter((product) => {
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

function ProductImage({ src, alt, className = 'thumb' }) {
  const [failed, setFailed] = useState(false);
  const Tag = className === 'thumb' ? 'div' : 'div';

  return (
    <Tag className={`${className}${failed ? ' noimg' : ''}`} role="img" aria-label={alt}>
      {!failed && <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    </Tag>
  );
}

function ProductCard({ product, onAdd, onBuy }) {
  return (
    <article className="card">
      <ProductImage src={product.img} alt="皮卡丘玩偶商品图" />
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
          <button className="btn primary" type="button" onClick={() => onBuy(product.id)}>立即购买</button>
          <button className="btn brand" type="button" onClick={() => onAdd(product.id)}>加入购物车</button>
        </div>
      </div>
    </article>
  );
}

function SegmentedFilter({ value, options, dataName, onChange }) {
  return (
    <div className="seg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'on' : ''}
          data-filter={dataName}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CartDrawer({ open, cart, onClose, onClear, onCheckout, onChangeQty, onRemove }) {
  const entries = Object.entries(cart);
  const count = cartCount(cart);

  return (
    <aside className={`drawer${open ? ' show' : ''}`} aria-label="购物车抽屉">
      <div className="drawer-hd">
        <div>
          <b>购物车</b>
          <div className="hint">已选 <span>{count}</span> 件</div>
        </div>
        <button className="close" type="button" aria-label="关闭" onClick={onClose}>×</button>
      </div>
      <div className="drawer-bd">
        {!entries.length && <div className="hint cart-empty">购物车还是空的，去挑点皮卡丘吧。</div>}
        {entries.map(([productId, qty]) => {
          const product = PRODUCTS.find((item) => item.id === productId);
          if (!product) return null;
          return (
            <div className="cart-item" key={productId}>
              <ProductImage src={product.img} alt="商品缩略图" className="mini" />
              <div>
                <div className="cart-name">{product.name}</div>
                <div className="cart-meta">
                  <div className="sub"><span className="item-price">¥{money(product.price)}</span> / 件</div>
                  <button className="linkbtn" type="button" onClick={() => onRemove(productId)}>删除</button>
                </div>
                <div className="cart-meta cart-qty-row">
                  <div className="qty" aria-label="数量">
                    <button type="button" onClick={() => onChangeQty(productId, qty - 1)}>-</button>
                    <input
                      value={qty}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(event) => onChangeQty(productId, event.target.value)}
                    />
                    <button type="button" onClick={() => onChangeQty(productId, qty + 1)}>+</button>
                  </div>
                  <div className="sub">小计 <b>¥{money(product.price * qty)}</b></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="drawer-ft">
        <div className="sumrow">
          <span>合计</span>
          <div><small>¥</small><b>{money(cartTotal(cart))}</b></div>
        </div>
        <div className="ft-actions">
          <button className="btn" type="button" disabled={!count} onClick={onClear}>清空</button>
          <button className="btn brand" type="button" disabled={!count} onClick={onCheckout}>去结算</button>
        </div>
      </div>
    </aside>
  );
}

function CheckoutModal({ open, cart, pay, form, onPayChange, onFormChange, onClose, onBackToCart, onSubmit }) {
  const goods = cartTotal(cart);
  const ship = goods >= 99 || goods === 0 ? 0 : 8;
  const discount = goods >= 199 ? 20 : 0;
  const payable = Math.max(0, goods + ship - discount);

  return (
    <div className={`modal${open ? ' show' : ''}`}>
      <div className="box">
        <div className="modal-hd">
          <b>确认订单</b>
          <button className="close" type="button" aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <div className="modal-bd">
          <section>
            <div className="field">
              <label>收货信息</label>
              <div className="formgrid">
                <div className="field">
                  <label className="hint">收货人</label>
                  <input className="ctrl" value={form.name} placeholder="例如：张三" onChange={(event) => onFormChange('name', event.target.value)} />
                </div>
                <div className="field">
                  <label className="hint">手机号</label>
                  <input className="ctrl" value={form.phone} placeholder="例如：138****8888" onChange={(event) => onFormChange('phone', event.target.value)} />
                </div>
                <div className="field full">
                  <label className="hint">收货地址</label>
                  <input className="ctrl" value={form.addr} placeholder="例如：北京市朝阳区某某路 88 号" onChange={(event) => onFormChange('addr', event.target.value)} />
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
              <b>提示：</b>该页面仅用于原型演示，“支付”会生成一个本地的模拟订单号，不会产生真实交易。
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
          <div className="hint">下单后可在本页看到“模拟支付结果”</div>
          <div className="modal-actions">
            <button className="btn" type="button" onClick={onBackToCart}>返回购物车</button>
            <button className="btn brand" type="button" onClick={onSubmit}>提交并支付</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('all');
  const [ship, setShip] = useState('all');
  const [price, setPrice] = useState('all');
  const [sort, setSort] = useState('smart');
  const [cart, setCart] = useState(() => loadJson(LS_CART, {}));
  const [pay, setPay] = useState('alipay');
  const [form, setForm] = useState({ name: '', phone: '', addr: '' });
  const [cartOpen, setCartOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');

  const list = useMemo(() => getSortedProducts({ query, size, ship, price, sort }), [query, size, ship, price, sort]);
  const count = cartCount(cart);

  useEffect(() => {
    saveJson(LS_CART, cart);
  }, [cart]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message) => setToast(message);

  const addToCart = (productId, qty = 1) => {
    setCart((current) => ({
      ...current,
      [productId]: Math.min(99, (current[productId] || 0) + qty),
    }));
    showToast('已加入购物车');
  };

  const search = () => {
    const nextQuery = queryInput.trim();
    setQuery(nextQuery);
    if (nextQuery) {
      const recent = loadJson(LS_RECENT, []);
      saveJson(LS_RECENT, [nextQuery, ...recent.filter((item) => item !== nextQuery)].slice(0, 8));
    }
  };

  const reset = () => {
    setQueryInput('');
    setQuery('');
    setSize('all');
    setShip('all');
    setPrice('all');
    setSort('smart');
    showToast('已重置筛选');
  };

  const changeQty = (productId, value) => {
    let qty = Number.parseInt(value, 10);
    if (Number.isNaN(qty) || qty < 1) qty = 1;
    if (qty > 99) qty = 99;
    setCart((current) => ({ ...current, [productId]: qty }));
  };

  const submitPayment = () => {
    if (!count) {
      showToast('购物车为空');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.addr.trim()) {
      showToast('请完整填写收货信息');
      return;
    }

    const orderNo = `MO${Date.now().toString().slice(-10)}`;
    const payName = pay === 'alipay' ? '支付宝' : pay === 'wechat' ? '微信支付' : '银行卡';
    setModalOpen(false);
    setCartOpen(false);
    setCart({});
    showToast(`支付成功（模拟）｜订单号 ${orderNo}`);
    window.setTimeout(() => {
      window.alert(`模拟支付完成\n\n订单号：${orderNo}\n支付方式：${payName}（模拟）\n收货人：${form.name}\n地址：${form.addr}\n\n说明：该站点仅用于原型演示，不会产生真实交易。`);
    }, 80);
  };

  const overlayOpen = cartOpen || modalOpen;

  return (
    <>
      <div className="topbar">
        <div className="inner">
          <div className="logo" title="示例站点（非真实交易/非真实支付）">
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
            <button className="iconbtn" type="button" aria-label="购物车" onClick={() => setCartOpen(true)}>
              购物车
              <span className="badge">{count}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <aside className="panel">
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
                  dataName="size"
                  onChange={setSize}
                  options={[
                    { value: 'all', label: '全部' },
                    { value: '20cm', label: '20cm' },
                    { value: '40cm', label: '40cm' },
                    { value: '60cm', label: '60cm' },
                    { value: '80cm', label: '80cm' },
                  ]}
                />
                <div className="hint">提示：点击切换规格筛选</div>
              </div>

              <div className="field">
                <label>发货</label>
                <SegmentedFilter
                  value={ship}
                  dataName="ship"
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
                  <b>{count}</b>
                  <span>购物车件数</span>
                </div>
              </div>

              <div className="hint">
                <b>说明</b>：这是静态演示站点，支付为“模拟支付”，不产生真实订单/扣款。
              </div>
            </div>
          </div>
        </aside>

        <main className="panel">
          <div className="panel-hd">
            <div className="listbar">
              <div className="title">
                <h1>皮卡丘玩偶热卖</h1>
                <span className="pill">{query ? `搜索：${query}` : '全部商品'}</span>
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
                  onAdd={addToCart}
                  onBuy={(productId) => {
                    addToCart(productId);
                    setCartOpen(true);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>
            {!list.length && <div className="hint empty">没有找到匹配商品，试试清空筛选或换个关键词。</div>}
          </div>
        </main>
      </div>

      <div
        className={`overlay${overlayOpen ? ' show' : ''}`}
        onClick={() => {
          setModalOpen(false);
          setCartOpen(false);
        }}
      />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onClear={() => {
          setCart({});
          showToast('购物车已清空');
        }}
        onCheckout={() => setModalOpen(true)}
        onChangeQty={changeQty}
        onRemove={(productId) => {
          setCart((current) => {
            const next = { ...current };
            delete next[productId];
            return next;
          });
          showToast('已删除商品');
        }}
      />

      <CheckoutModal
        open={modalOpen}
        cart={cart}
        pay={pay}
        form={form}
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