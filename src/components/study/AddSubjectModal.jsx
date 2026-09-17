import React, { useState } from 'react';
import { studyStore } from '../../utils/studyStore';
import { MdAdd } from 'react-icons/md';

const AddSubjectModal = ({ show, onClose, onRefresh }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a valid Subject Name');
      return;
    }

    studyStore.addSubject(name, description);
    setName('');
    setDescription('');
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
              <MdAdd size={22} /> Add New Subject 📚
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && <div className="alert alert-danger py-2" style={{ fontSize: '0.85rem' }}>{error}</div>}

              <div className="mb-3">
                <label className="form-label fw-semibold text-dark">Subject Name <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control rounded-2"
                  placeholder="e.g. Computer Networks, Mathematics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-dark">Description (Optional)</label>
                <textarea 
                  className="form-control rounded-2"
                  rows="3"
                  placeholder="Brief summary of topics covered in this subject"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="modal-footer bg-light border-0 px-4 py-3">
              <button type="button" className="btn btn-outline-secondary rounded-2 px-4" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary rounded-2 px-4 fw-bold">
                Save Subject
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSubjectModal;
