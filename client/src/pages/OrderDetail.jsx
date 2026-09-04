import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { useToast, extractErrorMessage } from '../context/ToastContext';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [orderRes, stagesRes] = await Promise.all([api.get(`/orders/${id}`), api.get('/stages')]);
        if (cancelled) return;
        setOrder(orderRes.data);
        setStages(stagesRes.data);
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to load order'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner label="Loading order…" />;
  if (!order) return <div className="empty-state">Order not found.</div>;

  const historyByStage = new Map(order.stageHistory.map((h) => [h.stageNumber, h]));
  const finalStageNumber = stages.length > 0 ? Math.max(...stages.map((s) => s.stageNumber)) : null;
  const getDefectQuantity = (h) =>
    typeof h.defectQuantity === 'number'
      ? h.defectQuantity
      : typeof h.completedQuantity === 'number'
        ? h.receivedQuantity - h.completedQuantity
        : null;
  const getPendingQuantity = (h) =>
    typeof h.pendingQuantity === 'number'
      ? h.pendingQuantity
      : typeof h.completedQuantity === 'number'
        ? h.receivedQuantity - h.completedQuantity - (getDefectQuantity(h) ?? 0)
        : null;
  const totalDefectQuantity = order.stageHistory.reduce((sum, h) => sum + (getDefectQuantity(h) ?? 0), 0);
  const currentEntry = historyByStage.get(order.currentStage);
  const currentStagePending =
    order.status === 'in-progress' && currentEntry
      ? (getPendingQuantity(currentEntry) ?? currentEntry.receivedQuantity)
      : 0;
  const totalPendingQuantity = order.stageHistory.reduce(
    (sum, h) => sum + (getPendingQuantity(h) ?? h.receivedQuantity ?? 0),
    0
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/orders" className="back-link">
            ← Back to Orders
          </Link>
          <h1>{order.orderUniqueId}</h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status === 'in-progress' && currentEntry && (
        <div className="stage-alert">
          <div className="stage-alert-icon">
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
          <div className="stage-alert-body">
            <div className="stage-alert-title">Currently Awaiting Action</div>
            <div className="stage-alert-main">
              <strong>{order.currentStageName || `Stage ${order.currentStage}`}</strong> team has this order
            </div>
          </div>
          <div className="stage-alert-value">
            <div className="summary-value">{currentStagePending}</div>
            <div className="summary-label">Pending Quantity</div>
          </div>
        </div>
      )}

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
            <div className="summary-value">{order.quantity}</div>
            <div className="summary-label">Order Quantity</div>
          </div>
        </div>
        <div className="summary-card summary-red">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.87 1.5h18.62a1 1 0 00.87-1.5L13.71 3.86a1 1 0 00-1.73 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{totalDefectQuantity}</div>
            <div className="summary-label">Total Defect Quantity</div>
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
      </div>

      <div className="card">
        <h2 className="section-title">Order Details</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Company Name</span>
            <span className="detail-value">{order.companyName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Order Unique ID</span>
            <span className="detail-value mono detail-value-accent">{order.orderUniqueId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">PCB Name</span>
            <span className="detail-value">{order.pcbName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">PCB Type</span>
            <span className="detail-value">{order.pcbType}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Quantity</span>
            <span className="detail-value">{order.quantity}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Order Date</span>
            <span className="detail-value">{formatDate(order.orderDate)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Dispatch Date</span>
            <span className="detail-value">{formatDate(order.dispatchDate)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <StatusBadge status={order.status} />
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Tracking</h2>
        <div className="timeline">
          {stages.map((stage) => {
            const entry = historyByStage.get(stage.stageNumber);
            const isCurrent = order.status === 'in-progress' && stage.stageNumber === order.currentStage;
            const isCompleted = !!entry?.completedDate;
            const isPending = !entry;

            let stateClass = 'timeline-pending';
            if (isCompleted) stateClass = 'timeline-completed';
            else if (isCurrent) stateClass = 'timeline-current';

            return (
              <div key={stage.stageNumber} className={`timeline-item ${stateClass}`}>
                <div className="timeline-marker">
                  {isCompleted ? '✓' : isCurrent ? '●' : stage.stageNumber}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-stage-name">
                      {stage.stageNumber}. {stage.stageName}
                    </span>
                    {isCompleted && <span className="badge badge-green">Completed</span>}
                    {isCurrent && !isCompleted && <span className="badge badge-yellow">In Progress</span>}
                    {isPending && <span className="badge badge-grey">Pending</span>}
                  </div>
                  {entry && (
                    <div className="timeline-details">
                      <div className="timeline-meta">
                        Received {formatDate(entry.receivedDate)}
                        {isCompleted && (
                          <>
                            {' · Completed '}
                            {formatDate(entry.completedDate)}
                            {entry.updatedBy ? ` · by ${entry.updatedBy}` : ''}
                          </>
                        )}
                      </div>
                      <div className="timeline-metrics">
                        <span className="metric-chip metric-chip-blue">
                          Received Qty <span className="metric-chip-value">{entry.receivedQuantity}</span>
                        </span>
                        {typeof entry.completedQuantity === 'number' ? (
                          <>
                            <span className="metric-chip metric-chip-green">
                              Completed Qty <span className="metric-chip-value">{entry.completedQuantity}</span>
                            </span>
                            <span
                              className={`metric-chip ${
                                (getDefectQuantity(entry) ?? 0) > 0 ? 'metric-chip-red' : 'metric-chip-grey'
                              }`}
                            >
                              Defect Qty <span className="metric-chip-value">{getDefectQuantity(entry) ?? '—'}</span>
                            </span>
                            <span
                              className={`metric-chip ${
                                (getPendingQuantity(entry) ?? 0) > 0 ? 'metric-chip-yellow' : 'metric-chip-grey'
                              }`}
                            >
                              Pending Qty{' '}
                              <span className="metric-chip-value">{getPendingQuantity(entry) ?? '—'}</span>
                            </span>
                          </>
                        ) : (
                          isCurrent && (
                            <span className="metric-chip metric-chip-yellow">
                              Pending Qty <span className="metric-chip-value">{entry.receivedQuantity}</span>
                            </span>
                          )
                        )}
                        {stage.stageNumber === finalStageNumber && (
                          <span className="metric-chip metric-chip-navy">
                            Total Defect Qty <span className="metric-chip-value">{totalDefectQuantity}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
