import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { useToast, extractErrorMessage } from '../context/ToastContext';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function Orders() {
  const navigate = useNavigate();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ total: 0, 'in-progress': 0, completed: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      const { data } = await api.get('/orders', { params });
      setOrders(data.orders);
      setCounts(data.counts);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 250);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <Link to="/orders/new" className="btn btn-primary">
          + New Order
        </Link>
      </div>

      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{counts.total}</div>
            <div className="summary-label">Total Orders</div>
          </div>
        </div>
        <div className="summary-card summary-yellow">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 7v5l3.5 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{counts['in-progress']}</div>
            <div className="summary-label">In Progress</div>
          </div>
        </div>
        <div className="summary-card summary-green">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{counts.completed}</div>
            <div className="summary-label">Completed</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by Order ID, Company, or PCB Name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="toolbar-search"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="toolbar-select">
            <option value="">All Statuses</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <Spinner label="Loading orders…" />
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Company</th>
                  <th>PCB Name</th>
                  <th>PCB Type</th>
                  <th>Quantity</th>
                  <th>Order Date</th>
                  <th>Dispatch Date</th>
                  <th>Current Stage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="clickable-row" onClick={() => navigate(`/orders/${order._id}`)}>
                    <td className="mono">{order.orderUniqueId}</td>
                    <td>{order.companyName}</td>
                    <td>{order.pcbName}</td>
                    <td>{order.pcbType}</td>
                    <td>{order.quantity}</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{formatDate(order.dispatchDate)}</td>
                    <td>{order.currentStageName || `Stage ${order.currentStage}`}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
