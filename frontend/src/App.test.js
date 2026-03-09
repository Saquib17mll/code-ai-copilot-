import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Employee Management System heading', () => {
  render(<App />);
  const heading = screen.getByText(/Employee Management System/i);
  expect(heading).toBeInTheDocument();
});
