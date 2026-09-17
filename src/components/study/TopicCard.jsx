import React from 'react';
import { studyStore } from '../../utils/studyStore';
import { MdCheckCircle, MdCancel, MdVideocam, MdDescription, MdAutorenew, MdDeleteOutline } from 'react-icons/md';

const TopicCard = ({ topic, subjectName, onRefresh }) => {
  const isCompleted = studyStore.isTopicCompleted(topic);

  const handleToggleLecture = () => {
    studyStore.toggleTask(topic.id, 'lecture');
    onRefresh && onRefresh();
  };

  const handleToggleNotes = () => {
    studyStore.toggleTask(topic.id, 'notes');
    onRefresh && onRefresh();
  };

  const handleToggleRevision = () => {
    studyStore.toggleTask(topic.id, 'revision');
    onRefresh && onRefresh();
  };

  const handleSetRevisionRequired = (isRequired) => {
    studyStore.setRevisionRequired(topic.id, isRequired);
    onRefresh && onRefresh();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete topic "${topic.name}"?`)) {
      studyStore.deleteTopic(topic.id);
      onRefresh && onRefresh();
    }
  };

  // Card overall border/shadow style
  const cardBorderClass = isCompleted 
    ? 'border-success bg-white shadow-sm' 
    : 'border-danger blinking-pending-card shadow-sm';

  return (
    <div className={`card h-100 rounded-3 transition-all ${cardBorderClass}`}>
      {/* Header */}
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between pt-3 px-3 pb-2 border-0">
        <div>
          <span className="badge bg-primary-subtle text-primary fw-semibold px-2 py-1 mb-1 me-2 rounded-2" style={{ fontSize: '0.75rem' }}>
            📚 {subjectName || 'Subject'}
          </span>
          <h5 className="card-title fw-bold text-dark mb-0 mt-1" style={{ fontSize: '1.1rem' }}>
            {topic.name}
          </h5>
        </div>

        <div className="d-flex align-items-center gap-2">
          {isCompleted ? (
            <span className="badge bg-success text-white px-3 py-2 rounded-pill fw-bold shadow-sm d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
              <MdCheckCircle size={16} /> 🎉 SUCCESS
            </span>
          ) : (
            <span className="badge bg-danger text-white px-3 py-2 rounded-pill fw-bold shadow-sm d-flex align-items-center gap-1 blinking-pending-text" style={{ fontSize: '0.85rem' }}>
              <MdCancel size={16} /> ⚠️ INCOMPLETE
            </span>
          )}
          <button className="btn btn-outline-danger btn-sm p-1 rounded-2 ms-1" onClick={handleDelete} title="Delete Topic">
            <MdDeleteOutline size={18} />
          </button>
        </div>
      </div>

      {/* Body: 3 Independent Cards */}
      <div className="card-body p-3">
        <div className="row g-2">
          
          {/* 1. 🎥 Lecture Card */}
          <div className="col-md-4">
            <div className={`p-3 rounded-3 h-100 d-flex flex-column justify-content-between border transition-all ${
              topic.lectureCompleted ? 'bg-success-subtle border-success' : 'bg-light border-secondary-subtle'
            }`}>
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold text-dark d-flex align-items-center gap-1" style={{ fontSize: '0.9rem' }}>
                    <MdVideocam className="text-primary" size={18} /> 🎥 Lecture
                  </span>
                  {topic.lectureCompleted ? (
                    <span className="badge bg-success text-white rounded-pill px-2 py-1" style={{ fontSize: '0.75rem' }}>
                      Completed ✅
                    </span>
                  ) : (
                    <span className="badge bg-danger text-white rounded-pill px-2 py-1" style={{ fontSize: '0.75rem' }}>
                      Pending 🔴
                    </span>
                  )}
                </div>
                <small className="text-muted d-block mb-3" style={{ fontSize: '0.78rem' }}>
                  {topic.lectureCompleted ? 'Lecture completed successfully' : 'Lecture pending to watch'}
                </small>
              </div>

              <button 
                className={`btn btn-sm w-100 fw-semibold rounded-2 ${topic.lectureCompleted ? 'btn-outline-success bg-white' : 'btn-primary'}`}
                onClick={handleToggleLecture}
              >
                {topic.lectureCompleted ? 'Mark Pending' : 'Mark Completed ✅'}
              </button>
            </div>
          </div>

          {/* 2. 📝 Make Notes Card */}
          <div className="col-md-4">
            <div className={`p-3 rounded-3 h-100 d-flex flex-column justify-content-between border transition-all ${
              topic.notesCompleted 
                ? 'bg-success-subtle border-success' 
                : 'bg-danger-subtle border-danger blinking-pending-card'
            }`}>
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold text-dark d-flex align-items-center gap-1" style={{ fontSize: '0.9rem' }}>
                    <MdDescription className="text-warning" size={18} /> 📝 Make Notes
                  </span>
                  {topic.notesCompleted ? (
                    <span className="badge bg-success text-white rounded-pill px-2 py-1" style={{ fontSize: '0.75rem' }}>
                      Completed ✅
                    </span>
                  ) : (
                    <span className="badge bg-danger text-white rounded-pill px-2 py-1 blinking-pending-text" style={{ fontSize: '0.75rem' }}>
                      Pending 🔴
                    </span>
                  )}
                </div>
                <small className="text-muted d-block mb-3" style={{ fontSize: '0.78rem' }}>
                  {topic.notesCompleted ? 'Notes written and saved' : 'Notes pending to make'}
                </small>
              </div>

              <button 
                className={`btn btn-sm w-100 fw-semibold rounded-2 ${topic.notesCompleted ? 'btn-outline-success bg-white' : 'btn-danger'}`}
                onClick={handleToggleNotes}
              >
                {topic.notesCompleted ? 'Mark Pending' : 'Mark Completed ✅'}
              </button>
            </div>
          </div>

          {/* 3. 🔄 Revision Card */}
          <div className="col-md-4">
            <div className={`p-3 rounded-3 h-100 d-flex flex-column justify-content-between border transition-all ${
              !topic.revisionRequired
                ? 'bg-secondary-subtle border-secondary'
                : topic.revisionCompleted 
                  ? 'bg-success-subtle border-success'
                  : 'bg-danger-subtle border-danger blinking-pending-card'
            }`}>
              <div>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="fw-bold text-dark d-flex align-items-center gap-1" style={{ fontSize: '0.9rem' }}>
                    <MdAutorenew className="text-info" size={18} /> 🔄 Revision
                  </span>
                  {!topic.revisionRequired ? (
                    <span className="badge bg-secondary text-white rounded-pill px-2 py-1" style={{ fontSize: '0.75rem' }}>
                      Skipped ⭕
                    </span>
                  ) : topic.revisionCompleted ? (
                    <span className="badge bg-success text-white rounded-pill px-2 py-1" style={{ fontSize: '0.75rem' }}>
                      Completed ✅
                    </span>
                  ) : (
                    <span className="badge bg-danger text-white rounded-pill px-2 py-1 blinking-pending-text" style={{ fontSize: '0.75rem' }}>
                      Pending 🔴
                    </span>
                  )}
                </div>

                {/* Revision Control ON/OFF */}
                <div className="bg-white bg-opacity-75 p-2 rounded-2 my-2 border">
                  <label className="fw-semibold text-muted d-block mb-1" style={{ fontSize: '0.72rem' }}>
                    Revision Required?
                  </label>
                  <div className="btn-group btn-group-sm w-100">
                    <button 
                      type="button" 
                      className={`btn py-0 px-2 fw-semibold ${topic.revisionRequired ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handleSetRevisionRequired(true)}
                      style={{ fontSize: '0.75rem' }}
                    >
                      ✅ Yes
                    </button>
                    <button 
                      type="button" 
                      className={`btn py-0 px-2 fw-semibold ${!topic.revisionRequired ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                      onClick={() => handleSetRevisionRequired(false)}
                      style={{ fontSize: '0.75rem' }}
                    >
                      ⭕ No (Skip)
                    </button>
                  </div>
                </div>
              </div>

              {topic.revisionRequired && (
                <button 
                  className={`btn btn-sm w-100 fw-semibold rounded-2 mt-2 ${topic.revisionCompleted ? 'btn-outline-success bg-white' : 'btn-warning text-dark'}`}
                  onClick={handleToggleRevision}
                >
                  {topic.revisionCompleted ? 'Mark Pending' : 'Mark Revision Done ✅'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TopicCard;
