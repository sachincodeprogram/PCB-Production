import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useToast, extractErrorMessage } from '../context/ToastContext';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function Team() {
  const { user, assignedStage } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageName, setStageName] = useState('');
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [completedQuantity, setCompletedQuantity] = useState('');
  const [defectQuantity, setDefectQuantity] = useState('');
  const [completing, setCompleting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/team/my-orders');
      setOrders(data);
      if (data.length > 0) {
        // fall back to stage number if no name info in payload
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load your orders'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOrders();
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

  const handleComplete = async () => {
    if (!confirmOrder) return;
    const qty = Number(completedQuantity);
    if (completedQuantity === '' || !Number.isFinite(qty) || qty < 0) {
      toast.error('Enter a valid completed quantity');
      return;
    }
    const defQty = Number(defectQuantity);
    if (defectQuantity === '' || !Number.isFinite(defQty) || defQty < 0) {
      toast.error('Enter a valid defect quantity');
      return;
    }
    if (qty + defQty > confirmOrder.pendingQuantity) {
      toast.error(`Completed + Defect quantity cannot exceed the pending quantity (${confirmOrder.pendingQuantity})`);
      return;
    }
    const willForward = qty + defQty === confirmOrder.pendingQuantity;
    setCompleting(true);
    try {
      await api.post(`/team/complete/${confirmOrder.orderId}`, { completedQuantity: qty, defectQuantity: defQty });
      toast.success(
        willForward
          ? `${confirmOrder.orderUniqueId} marked complete and forwarded`
          : `${confirmOrder.orderUniqueId} progress saved — still pending at this stage`
      );
      setConfirmOrder(null);
      setCompletedQuantity('');
      setDefectQuantity('');
      fetchOrders();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save progress'));
    } finally {
      setCompleting(false);
    }
  };

  const pendingQuantity =
    confirmOrder &&
    completedQuantity !== '' &&
    defectQuantity !== '' &&
    Number.isFinite(Number(completedQuantity)) &&
    Number.isFinite(Number(defectQuantity))
      ? confirmOrder.pendingQuantity - Number(completedQuantity) - Number(defectQuantity)
      : null;
  const pendingIsNegative = typeof pendingQuantity === 'number' && pendingQuantity < 0;
  const willForwardNow = typeof pendingQuantity === 'number' && pendingQuantity === 0;

  const totalPendingQuantity = orders.reduce((sum, o) => sum + (o.pendingQuantity ?? o.receivedQuantity ?? 0), 0);
  const oldestReceivedDate = orders.reduce((oldest, o) => {
    if (!o.receivedDate) return oldest;
    const d = new Date(o.receivedDate);
    return !oldest || d < oldest ? d : oldest;
  }, null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{stageName || 'My Department'}</h1>
          <p className="page-subtitle">{user?.name}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchOrders} disabled={loading}>
          ↻ Refresh
        </button>
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
            <div className="summary-value">{orders.length}</div>
            <div className="summary-label">Orders Awaiting Action</div>
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
            <div className="summary-value">{totalPendingQuantity}</div>
            <div className="summary-label">Total Pending Quantity</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 2v4M16 2v4M3.5 9h17M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{oldestReceivedDate ? formatDate(oldestReceivedDate) : '—'}</div>
            <div className="summary-label">Oldest Waiting Since</div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner label="Loading orders…" />
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders at your stage right now.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>PCB Name</th>
                  <th>Company</th>
                  <th>Received Date</th>
                  <th>Received Quantity</th>
                  <th>Pending Quantity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderId}>
                    <td className="mono">{order.orderUniqueId}</td>
                    <td>{order.pcbName}</td>
                    <td>{order.companyName}</td>
                    <td>{formatDate(order.receivedDate)}</td>
                    <td>{order.receivedQuantity}</td>
                    <td>
                      <span className="metric-chip metric-chip-yellow">
                        <span className="metric-chip-value">{order.pendingQuantity}</span>
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setConfirmOrder(order);
                          setCompletedQuantity(String(order.pendingQuantity));
                          setDefectQuantity('0');
                        }}
                      >
                        {order.completedQuantitySoFar > 0 || order.defectQuantitySoFar > 0
                          ? 'Continue & Complete'
                          : 'Mark Complete & Forward'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmOrder && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (completing) return;
            setConfirmOrder(null);
            setCompletedQuantity('');
            setDefectQuantity('');
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Update Stage Progress</h3>
            <p>
              Log completed &amp; defect quantity for <strong>{confirmOrder.orderUniqueId}</strong> (
              {confirmOrder.pcbName}) at this stage.
            </p>
            <label className="field">
              <span className="field-label">Received Quantity</span>
              <input type="number" value={confirmOrder.receivedQuantity} disabled />
            </label>
            {(confirmOrder.completedQuantitySoFar > 0 || confirmOrder.defectQuantitySoFar > 0) && (
              <p className="modal-progress-note">
                Already logged so far: <strong>{confirmOrder.completedQuantitySoFar}</strong> completed,{' '}
                <strong>{confirmOrder.defectQuantitySoFar}</strong> defect —{' '}
                <strong>{confirmOrder.pendingQuantity}</strong> still pending.
              </p>
            )}
            <label className="field">
              <span className="field-label">Completed Quantity</span>
              <input
                type="number"
                min="0"
                max={confirmOrder.pendingQuantity}
                value={completedQuantity}
                onChange={(e) => setCompletedQuantity(e.target.value)}
                disabled={completing}
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field-label">Defect Quantity</span>
              <input
                type="number"
                min="0"
                max={confirmOrder.pendingQuantity}
                value={defectQuantity}
                onChange={(e) => setDefectQuantity(e.target.value)}
                disabled={completing}
              />
            </label>
            <div className="modal-stats">
              <div className="modal-stat modal-stat-green">
                <span className="modal-stat-label">Completed</span>
                <span className="modal-stat-value">{completedQuantity !== '' ? completedQuantity : '—'}</span>
              </div>
              <div className="modal-stat modal-stat-red">
                <span className="modal-stat-label">Defect</span>
                <span className="modal-stat-value">{defectQuantity !== '' ? defectQuantity : '—'}</span>
              </div>
              <div className="modal-stat modal-stat-yellow">
                <span className="modal-stat-label">Pending Quantity</span>
                <span className="modal-stat-value">{pendingQuantity ?? '—'}</span>
              </div>
            </div>
            {pendingIsNegative ? (
              <p className="modal-stat-warning">Completed + Defect exceeds the pending quantity.</p>
            ) : (
              <p className={`modal-outcome-note ${willForwardNow ? 'modal-outcome-forward' : 'modal-outcome-stay'}`}>
                {willForwardNow
                  ? 'All units accounted for — this will complete the stage and forward it to the next stage.'
                  : 'This order will stay in your queue with the remaining pending quantity until fully processed.'}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setConfirmOrder(null);
                  setCompletedQuantity('');
                  setDefectQuantity('');
                }}
                disabled={completing}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={completing}>
                {completing ? 'Saving…' : willForwardNow ? 'Confirm & Forward' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
