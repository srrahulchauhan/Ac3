import React, { useState } from 'react';
import { studyStore } from '../../utils/studyStore';
import { MdAdd } from 'react-icons/md';

const AddTopicModal = ({ show, onClose, subjects, defaultSubjectId, onRefresh }) => {
  const [subjectId, setSubjectId] = useState(defaultSubjectId || (subjects.length > 0 ? subjects[0].id : ''));
  const [name, setName] = useState('');
  const [revisionRequired, setRevisionRequired] = useState(true);
  const [error, setError] = useState('');

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please select a Subject');
      return;
    }
    if (!name.trim()) {
      setError('Please enter a Topic Name');
      return;
    }

    studyStore.addTopic(subjectId, name, revisionRequired);
    setName('');
    setError('');
    onRefresh && onRefresh();
    onClose();
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-3">
          <div className="modal-header bg-primary text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <MdAdd size={22} /> Add New Topic 📖
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && <div className="alert alert-danger py-2" style={{ fontSize: '0.85rem' }}>{error}</div>}

              <div className="mb-3">
                <label className="form-label fw-semibold text-dark">Select Subject <span className="text-danger">*</span></label>
                <select 
                  className="form-select rounded-2"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-dark">Topic Name <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control rounded-2"
                  placeholder="e.g. CPU Scheduling Algorithms, TCP/IP Model"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="mb-3 bg-light p-3 rounded-3 border">
                <label className="fw-semibold text-dark d-block mb-1">Revision Required for this Topic?</label>
                <small className="text-muted d-block mb-2" style={{ fontSize: '0.78rem' }}>
                  If set to "No", revision will be excluded from the completion calculation of this topic.
                </small>
                <div className="d-flex gap-4">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="revRequiredRadio" 
                      id="revYes" 
                      checked={revisionRequired === true}
                      onChange={() => setRevisionRequired(true)}
                    />
                    <label className="form-check-label fw-semibold text-dark" htmlFor="revYes">
                      ✅ Yes (Compulsory)
                    </label>
                  </div>
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="radio" 
                      name="revRequiredRadio" 
                      id="revNo" 
                      checked={revisionRequired === false}
                      onChange={() => setRevisionRequired(false)}
                    />
                    <label className="form-check-label fw-semibold text-dark" htmlFor="revNo">
                      ⭕ No (Skip Revision)
                    </label>
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-footer bg-light border-0 px-4 py-3">
              <button type="button" className="btn btn-outline-secondary rounded-2 px-4" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary rounded-2 px-4 fw-bold">
                Save Topic
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTopicModal;
