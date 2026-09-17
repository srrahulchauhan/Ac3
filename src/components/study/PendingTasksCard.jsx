import React from 'react';
import { studyStore } from '../../utils/studyStore';
import { MdCheckCircle, MdWarning, MdArrowForward } from 'react-icons/md';

const PendingTasksCard = ({ pendingTasks, onRefresh }) => {
  const handleCompleteTask = (topicId, taskType) => {
    studyStore.toggleTask(topicId, taskType);
    onRefresh && onRefresh();
  };

  if (!pendingTasks || pendingTasks.length === 0) {
    return (
      <div className="card border-0 shadow-sm rounded-3 bg-white p-4 text-center">
        <div className="text-success mb-2">
          <MdCheckCircle size={48} />
        </div>
        <h5 className="fw-bold text-dark">No Pending Tasks! 🎉</h5>
        <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
          All your topics and required tasks are 100% completed. Great job!
        </p>
      </div>
    );
  }

  return (
    <div className="card border-danger blinking-pending-card shadow-sm rounded-3">
      <div className="card-header bg-danger text-white d-flex align-items-center justify-content-between py-3 px-4">
        <div className="d-flex align-items-center gap-2">
          <MdWarning size={24} className="blinking-pending-text text-white" />
          <h5 className="mb-0 fw-bold">🔴 Centralized Pending Tasks ({pendingTasks.length})</h5>
        </div>
        <span className="badge bg-white text-danger fw-bold rounded-pill px-3 py-1">
          Requires Action
        </span>
      </div>

      <div className="card-body p-3">
        <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
          Note: Incomplete tasks carry forward automatically every day until marked complete. Click <strong>"Continue → Complete"</strong> to resolve.
        </p>

        <div className="row g-2">
          {pendingTasks.map((task) => (
            <div className="col-md-6 col-lg-4" key={task.id}>
              <div className="p-3 bg-white border border-danger rounded-3 shadow-sm d-flex flex-column justify-content-between h-100">
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="badge bg-secondary-subtle text-dark fw-semibold" style={{ fontSize: '0.72rem' }}>
                      📚 {task.subjectName}
                    </span>
                    <span className="badge bg-danger text-white blinking-pending-text" style={{ fontSize: '0.72rem' }}>
                      Pending 🔴
                    </span>
                  </div>

                  <h6 className="fw-bold text-dark mb-2 mt-1" style={{ fontSize: '0.95rem' }}>
                    {task.topicName}
                  </h6>

                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span style={{ fontSize: '1.2rem' }}>{task.icon}</span>
                    <span className="fw-semibold text-danger" style={{ fontSize: '0.85rem' }}>
                      {task.taskLabel}
                    </span>
                  </div>
                </div>

                <button 
                  className="btn btn-danger btn-sm w-100 fw-bold rounded-2 d-flex align-items-center justify-content-center gap-2 hover-lift"
                  onClick={() => handleCompleteTask(task.topicId, task.taskType)}
                >
                  <span>Continue → Complete</span>
                  <MdArrowForward size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PendingTasksCard;
