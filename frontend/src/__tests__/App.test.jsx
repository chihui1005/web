import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';

const products = [
  {
    id: 'p4',
    name: '皮卡丘玩偶 80cm｜超大抱枕（礼盒装）',
    price: 219,
    size: '80cm',
    ship: '48h',
    sales: 4210,
    tags: ['hot', 'new'],
    image: 'pikachu-04.jpg',
  },
];

function jsonResponse(payload, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    json: async () => payload,
  });
}

describe('App cart flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    const carts = {
      ash: { items: [], count: 0, total: 0 },
      misty: { items: [], count: 0, total: 0 },
    };
    const orders = {
      ash: [
        {
          order_no: 'MO-ASH-001',
          status: 'paid',
          payment_method: 'alipay',
          recipient_name: '张三',
          phone: '13800000000',
          address: '北京市朝阳区测试路88号',
          goods_total: 219,
          shipping_fee: 0,
          discount_total: 20,
          payable_total: 199,
          created_at: '2026-07-11T15:30:57.244758',
          items: [{ product_id: 'p4', product_name: products[0].name, product_size: '80cm', product_ship: '48h', image: 'pikachu-04.jpg', unit_price: 219, quantity: 1 }],
        },
      ],
      misty: [],
    };

    const userByToken = {
      'token-ash': { id: 1, username: 'ash', display_name: '小智' },
      'token-misty': { id: 2, username: 'misty', display_name: '小霞' },
    };

    window.fetch = vi.fn(async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init.method || 'GET').toUpperCase();
      const token = init.headers instanceof Headers ? init.headers.get('Authorization')?.replace('Bearer ', '') : null;
      const currentUser = token ? userByToken[token] : null;

      if (url.endsWith('/api/products') && method === 'GET') {
        return jsonResponse(products);
      }

      if (url.endsWith('/api/auth/login') && method === 'POST') {
        const { username } = JSON.parse(init.body);
        if (username === 'misty') {
          return jsonResponse({
            access_token: 'token-misty',
            token_type: 'bearer',
            user: userByToken['token-misty'],
          });
        }
        return jsonResponse({
          access_token: 'token-ash',
          token_type: 'bearer',
          user: userByToken['token-ash'],
        });
      }

      if (url.endsWith('/api/auth/me') && method === 'GET') {
        return jsonResponse(currentUser);
      }

      if (url.endsWith('/api/cart') && method === 'GET') {
        return jsonResponse(carts[currentUser.username]);
      }

      if (url.endsWith('/api/orders') && method === 'GET') {
        return jsonResponse(orders[currentUser.username]);
      }

      if (url.endsWith('/api/cart/items') && method === 'POST') {
        carts[currentUser.username] = {
          items: [{ product: products[0], quantity: 1, subtotal: 219 }],
          count: 1,
          total: 219,
        };
        return jsonResponse(carts[currentUser.username]);
      }

      throw new Error(`Unhandled fetch ${method} ${url}`);
    });
  });

  it('adds the selected product into the cart after logging in and clicking 加入购物车', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('登录后进入皮卡丘玩偶旗舰店');
    await user.click(screen.getByRole('button', { name: '登录' }));
    await screen.findByText('@ash');
    await screen.findByText('皮卡丘玩偶 80cm｜超大抱枕（礼盒装）');

    const productName = '皮卡丘玩偶 80cm｜超大抱枕（礼盒装）';
    const productCard = screen.getByText(productName).closest('.card');

    expect(productCard).not.toBeNull();

    await user.click(within(productCard).getByRole('button', { name: '加入购物车' }));
    await user.click(screen.getByRole('button', { name: '购物车' }));

    const cartDrawer = screen.getByLabelText('购物车抽屉');

    expect(within(cartDrawer).getByText(productName)).toBeInTheDocument();
    expect(within(cartDrawer).getByDisplayValue('1')).toBeInTheDocument();
  });

  it('clears session UI on logout and reloads the next login user data consistently', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('登录后进入皮卡丘玩偶旗舰店');
    await user.click(screen.getByRole('button', { name: '登录' }));
    await screen.findByText('@ash');
    await screen.findByText('共 1 单');

    await user.click(screen.getByRole('button', { name: '当前登录用户：小智，点击退出登录' }));

    expect(screen.getByText('未登录')).toBeInTheDocument();
    expect(screen.getByText('登录后进入皮卡丘玩偶旗舰店')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toHaveValue('');

    await user.clear(screen.getByLabelText('用户名'));
    await user.type(screen.getByLabelText('用户名'), 'misty');
    await user.type(screen.getByLabelText('密码'), 'togepi123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await screen.findByText('@misty');
    expect(screen.getByText('共 0 单')).toBeInTheDocument();
    expect(screen.getByText('还没有订单，先把喜欢的皮卡丘加入购物车吧。')).toBeInTheDocument();
    expect(screen.getByLabelText('购物车')).toHaveTextContent('0');
  });
});