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
    if (qty > confirmOrder.receivedQuantity) {
      toast.error('Completed quantity cannot exceed received quantity');
      return;
    }
    setCompleting(true);
    try {
      await api.post(`/team/complete/${confirmOrder.orderId}`, { completedQuantity: qty });
      toast.success(`${confirmOrder.orderUniqueId} marked complete and forwarded`);
      setConfirmOrder(null);
      setCompletedQuantity('');
      fetchOrders();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to mark order complete'));
    } finally {
      setCompleting(false);
    }
  };

  const defectQuantity =
    confirmOrder && completedQuantity !== '' && Number.isFinite(Number(completedQuantity))
      ? Math.max(confirmOrder.receivedQuantity - Number(completedQuantity), 0)
      : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{stageName || 'My Department'}</h1>
          <p className="page-subtitle">{user?.name}</p>
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
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setConfirmOrder(order);
                          setCompletedQuantity(String(order.receivedQuantity));
                        }}
                      >
                        Mark Complete &amp; Forward
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
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Completion</h3>
            <p>
              Mark order <strong>{confirmOrder.orderUniqueId}</strong> ({confirmOrder.pcbName}) as complete at this
              stage and forward it to the next stage.
            </p>
            <label className="field">
              <span className="field-label">Received Quantity</span>
              <input type="number" value={confirmOrder.receivedQuantity} disabled />
            </label>
            <label className="field">
              <span className="field-label">Completed Quantity</span>
              <input
                type="number"
                min="0"
                max={confirmOrder.receivedQuantity}
                value={completedQuantity}
                onChange={(e) => setCompletedQuantity(e.target.value)}
                disabled={completing}
                autoFocus
              />
            </label>
            <p>
              Defect Quantity = Received Quantity − Completed Quantity ={' '}
              <strong>{defectQuantity ?? '—'}</strong>
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setConfirmOrder(null);
                  setCompletedQuantity('');
                }}
                disabled={completing}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleComplete} disabled={completing}>
                {completing ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
