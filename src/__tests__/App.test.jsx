import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';

describe('App cart flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds the selected product into the cart after clicking 加入购物车', async () => {
    const user = userEvent.setup();

    render(<App />);

    const productName = '皮卡丘玩偶 80cm｜超大抱枕（礼盒装）';
    const productCard = screen.getByText(productName).closest('.card');

    expect(productCard).not.toBeNull();

    await user.click(within(productCard).getByRole('button', { name: '加入购物车' }));
    await user.click(screen.getByRole('button', { name: '购物车' }));

    const cartDrawer = screen.getByLabelText('购物车抽屉');

    expect(within(cartDrawer).getByText(productName)).toBeInTheDocument();
    expect(within(cartDrawer).getByDisplayValue('1')).toBeInTheDocument();
  });
});