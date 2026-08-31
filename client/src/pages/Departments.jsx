import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { useToast, extractErrorMessage } from '../context/ToastContext';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function Departments() {
  const toast = useToast();
  const navigate = useNavigate();
  const [stages, setStages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeStage, setActiveStage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [stagesRes, ordersRes] = await Promise.all([
          api.get('/stages'),
          api.get('/orders', { params: { status: 'in-progress' } }),
        ]);
        setStages(stagesRes.data);
        setOrders(ordersRes.data.orders);
        if (stagesRes.data.length > 0) setActiveStage(stagesRes.data[0].stageNumber);
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to load departments'));
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const stageOrders = useMemo(
    () => orders.filter((o) => o.currentStage === activeStage),
    [orders, activeStage]
  );

  const countsByStage = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      counts[o.currentStage] = (counts[o.currentStage] || 0) + 1;
    });
    return counts;
  }, [orders]);

  if (loading) return <Spinner label="Loading departments…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p className="page-subtitle">{orders.length} orders currently in progress across all stages</p>
        </div>
      </div>

      <div className="tabs">
        {stages.map((stage) => (
          <button
            key={stage.stageNumber}
            className={`tab ${activeStage === stage.stageNumber ? 'tab-active' : ''}`}
            onClick={() => setActiveStage(stage.stageNumber)}
          >
            {stage.stageNumber}. {stage.stageName}
            {!!countsByStage[stage.stageNumber] && (
              <span className="tab-count">{countsByStage[stage.stageNumber]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="card">
        {stageOrders.length === 0 ? (
          <div className="empty-state">No pending orders at this stage.</div>
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
                </tr>
              </thead>
              <tbody>
                {stageOrders.map((order) => (
                  <tr key={order._id} className="clickable-row" onClick={() => navigate(`/orders/${order._id}`)}>
                    <td className="mono">{order.orderUniqueId}</td>
                    <td>{order.companyName}</td>
                    <td>{order.pcbName}</td>
                    <td>{order.pcbType}</td>
                    <td>{order.quantity}</td>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{formatDate(order.dispatchDate)}</td>
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
