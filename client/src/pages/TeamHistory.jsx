import { useEffect, useState, useCallback, Fragment } from 'react';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useToast, extractErrorMessage } from '../context/ToastContext';

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function TeamHistory() {
  const { user, assignedStage } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageName, setStageName] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get('/team/completed-orders', { params });
      setOrders(data);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load completed orders'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to]);

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 250);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  useEffect(() => {
    const onFocus = () => fetchOrders();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchOrders();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchOrders]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/stages');
        const stage = data.find((s) => s.stageNumber === assignedStage);
        setStageName(stage ? stage.stageName : `Stage ${assignedStage}`);
      } catch {
        setStageName(`Stage ${assignedStage}`);
      }
    })();
  }, [assignedStage]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{stageName ? `${stageName} — Completed Orders` : 'Completed Orders'}</h1>
          <p className="page-subtitle">{user?.name}</p>
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
          <label className="toolbar-date-field">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="toolbar-select" />
          </label>
          <label className="toolbar-date-field">
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="toolbar-select" />
          </label>
          {(search || from || to) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setFrom('');
                setTo('');
              }}
            >
              Clear Filters
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={fetchOrders} disabled={loading}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <Spinner label="Loading completed orders…" />
        ) : orders.length === 0 ? (
          <div className="empty-state">No completed orders found for this filter.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>PCB Name</th>
                  <th>Company</th>
                  <th>Received Qty</th>
                  <th>Completed Qty</th>
                  <th>Defect Qty</th>
                  <th>Completed On</th>
                  <th>By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isExpanded = expandedId === order.orderId;
                  const hasMultipleActions = (order.actions || []).length > 1;
                  return (
                    <Fragment key={order.orderId}>
                      <tr
                        className={hasMultipleActions ? 'clickable-row' : ''}
                        onClick={() => hasMultipleActions && setExpandedId(isExpanded ? null : order.orderId)}
                      >
                        <td className="mono">{order.orderUniqueId}</td>
                        <td>{order.pcbName}</td>
                        <td>{order.companyName}</td>
                        <td>{order.receivedQuantity}</td>
                        <td>
                          <span className="metric-chip metric-chip-green">
                            <span className="metric-chip-value">{order.completedQuantity}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className={`metric-chip ${order.defectQuantity > 0 ? 'metric-chip-red' : 'metric-chip-grey'}`}
                          >
                            <span className="metric-chip-value">{order.defectQuantity}</span>
                          </span>
                        </td>
                        <td>{formatDateTime(order.completedDate)}</td>
                        <td>{order.updatedBy || '—'}</td>
                        <td>
                          {hasMultipleActions && (
                            <span className="expand-toggle">{isExpanded ? '▲ Hide log' : '▼ Show log'}</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasMultipleActions && (
                        <tr className="action-log-row">
                          <td colSpan={9}>
                            <div className="action-log">
                              {order.actions.map((action, idx) => (
                                <div className="action-log-card" key={idx}>
                                  <div className="action-log-date">{formatDateTime(action.actionDate)}</div>
                                  <div className="action-log-stats">
                                    <span className="metric-chip metric-chip-green">
                                      Completed <span className="metric-chip-value">{action.completedQuantity}</span>
                                    </span>
                                    <span className="metric-chip metric-chip-red">
                                      Defect <span className="metric-chip-value">{action.defectQuantity}</span>
                                    </span>
                                    <span className="metric-chip metric-chip-yellow">
                                      Pending After{' '}
                                      <span className="metric-chip-value">{action.pendingQuantityAfter}</span>
                                    </span>
                                  </div>
                                  <div className="action-log-by">by {action.updatedBy || '—'}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
