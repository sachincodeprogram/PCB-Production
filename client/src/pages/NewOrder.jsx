import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast, extractErrorMessage } from '../context/ToastContext';

const initialForm = {
  companyName: '',
  pcbName: '',
  pcbType: '',
  quantity: '',
  orderDate: '',
  dispatchDate: '',
};

export default function NewOrder() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = [];
    if (!form.companyName.trim()) errs.push('Company Name is required');
    if (!form.pcbName.trim()) errs.push('PCB Name is required');
    if (!form.pcbType.trim()) errs.push('PCB Type is required');
    if (!form.quantity || Number(form.quantity) <= 0) errs.push('Quantity must be a positive number');
    if (!form.orderDate) errs.push('Order Date is required');
    if (!form.dispatchDate) errs.push('Dispatch Date is required');
    if (form.orderDate && form.dispatchDate && new Date(form.dispatchDate) <= new Date(form.orderDate)) {
      errs.push('Dispatch Date must be after Order Date');
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (validation.length > 0) return;

    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        ...form,
        quantity: Number(form.quantity),
      });
      setCreated(data);
      toast.success(`Order ${data.orderUniqueId} booked successfully`);
      setForm(initialForm);
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to create order');
      setErrors([msg]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="card success-card">
        <div className="success-icon">✓</div>
        <h2>Order Booked Successfully</h2>
        <p className="success-order-id">{created.orderUniqueId}</p>
        <div className="success-actions">
          <Link to={`/orders/${created._id}`} className="btn btn-primary">
            View Order
          </Link>
          <button className="btn btn-ghost" onClick={() => setCreated(null)}>
            Book Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Order</h1>
          <p className="page-subtitle">Book a new PCB order — it starts at Stage 1 and is tracked automatically.</p>
        </div>
      </div>

      <div>
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Company Name</span>
              <input type="text" value={form.companyName} onChange={update('companyName')} required />
            </label>
            <label className="field">
              <span className="field-label">PCB Name</span>
              <input type="text" value={form.pcbName} onChange={update('pcbName')} required />
            </label>
            <label className="field">
              <span className="field-label">PCB Type</span>
              <input type="text" value={form.pcbType} onChange={update('pcbType')} required />
            </label>
            <label className="field">
              <span className="field-label">Quantity</span>
              <input type="number" min="1" value={form.quantity} onChange={update('quantity')} required />
            </label>
            <label className="field">
              <span className="field-label">Order Date</span>
              <input type="date" value={form.orderDate} onChange={update('orderDate')} required />
            </label>
            <label className="field">
              <span className="field-label">Dispatch Date</span>
              <input type="date" value={form.dispatchDate} onChange={update('dispatchDate')} required />
            </label>
          </div>

          {errors.length > 0 && (
            <div className="form-error">
              <ul>
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Booking…' : 'Book Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
