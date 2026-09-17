import React, { useState, useEffect, useCallback } from 'react';
import { studyStore } from '../utils/studyStore';
import TopicCard from '../components/study/TopicCard';
import PendingTasksCard from '../components/study/PendingTasksCard';
import AddSubjectModal from '../components/study/AddSubjectModal';
import AddTopicModal from '../components/study/AddTopicModal';
import { 
  MdVideocam, MdDescription, MdAutorenew, MdWarning, 
  MdCheckCircle, MdAdd, MdLibraryBooks, MdFilterList, MdDeleteOutline 
} from 'react-icons/md';

const StudyTracker = () => {
  const [data, setData] = useState(studyStore.getData());
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'lectures', 'notes', 'revision', 'pending', 'completed'
  const [selectedSubjectId, setSelectedSubjectId] = useState('ALL');
  
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);

  const loadStoreData = useCallback(() => {
    setData(studyStore.getData());
  }, []);

  useEffect(() => {
    loadStoreData();
    window.addEventListener('studyStoreUpdated', loadStoreData);
    return () => window.removeEventListener('studyStoreUpdated', loadStoreData);
  }, [loadStoreData]);

  const { subjects, topics } = data;

  // Filter topics by Subject if selected
  const filteredTopics = topics.filter(t => {
    if (selectedSubjectId !== 'ALL' && t.subjectId !== selectedSubjectId) return false;

    if (selectedTab === 'lectures') return true;
    if (selectedTab === 'notes') return true;
    if (selectedTab === 'revision') return true;
    if (selectedTab === 'completed') return studyStore.isTopicCompleted(t);
    if (selectedTab === 'pending') return !studyStore.isTopicCompleted(t);
    return true;
  });

  // Calculate Metrics
  const totalTopics = topics.length;
  const completedTopicsCount = topics.filter(t => studyStore.isTopicCompleted(t)).length;
  const incompleteTopicsCount = totalTopics - completedTopicsCount;

  const lecturesCompletedCount = topics.filter(t => t.lectureCompleted).length;
  const lecturesPendingCount = totalTopics - lecturesCompletedCount;

  const notesCompletedCount = topics.filter(t => t.notesCompleted).length;
  const notesPendingCount = totalTopics - notesCompletedCount;

  const revisionRequiredTopics = topics.filter(t => t.revisionRequired);
  const revisionCompletedCount = topics.filter(t => t.revisionRequired && t.revisionCompleted).length;
  const revisionPendingCount = revisionRequiredTopics.length - revisionCompletedCount;
  const revisionSkippedCount = totalTopics - revisionRequiredTopics.length;

  const pendingTasksList = studyStore.getPendingTasks();

  const getSubjectName = (subjectId) => {
    const s = subjects.find(sub => sub.id === subjectId);
    return s ? s.name : 'General Subject';
  };

  const handleDeleteSubject = (subId, subName) => {
    if (window.confirm(`Are you sure you want to delete subject "${subName}" and all its topics?`)) {
      studyStore.deleteSubject(subId);
      loadStoreData();
    }
  };

  return (
    <div className="container-fluid py-4 px-md-4 page-transition">
      
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 bg-white p-4 rounded-3 shadow-sm border">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="fs-3">📚</span>
            <h3 className="fw-bold text-dark mb-0">Topic Completion System</h3>
          </div>
          <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.9rem' }}>
            Lecture + Notes Making + Revision independent task tracking system
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            className="btn btn-outline-primary fw-semibold rounded-2 d-flex align-items-center gap-1 hover-lift"
            onClick={() => setShowAddSubjectModal(true)}
          >
            <MdAdd size={20} /> Add Subject
          </button>
          <button 
            className="btn btn-primary fw-semibold rounded-2 d-flex align-items-center gap-1 shadow-sm hover-lift"
            onClick={() => setShowAddTopicModal(true)}
            disabled={subjects.length === 0}
          >
            <MdAdd size={20} /> Add Topic
          </button>
        </div>
      </div>

      {/* Top Metrics Cards Bar */}
      <div className="row g-3 mb-4">
        
        {/* Total Topics */}
        <div className="col-6 col-md-4 col-xl-2">
          <div 
            className={`card border-0 shadow-sm rounded-3 h-100 p-3 hover-lift cursor-pointer ${selectedTab === 'all' ? 'ring-2 ring-primary bg-primary-subtle' : 'bg-white'}`}
            onClick={() => setSelectedTab('all')}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold" style={{ fontSize: '0.8rem' }}>Total Topics</span>
              <MdLibraryBooks className="text-primary" size={22} />
            </div>
            <h3 className="fw-bold text-dark mb-1">{totalTopics}</h3>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              {completedTopicsCount} Finished / {incompleteTopicsCount} Incomplete
            </small>
          </div>
        </div>

        {/* 🎥 Lecture Card */}
        <div className="col-6 col-md-4 col-xl-2">
          <div 
            className={`card border-0 shadow-sm rounded-3 h-100 p-3 hover-lift cursor-pointer ${selectedTab === 'lectures' ? 'ring-2 ring-primary bg-primary-subtle' : 'bg-white'}`}
            onClick={() => setSelectedTab('lectures')}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold" style={{ fontSize: '0.8rem' }}>🎥 Lecture</span>
              <MdVideocam className="text-primary" size={22} />
            </div>
            <h3 className="fw-bold text-dark mb-1">{lecturesCompletedCount} <span className="fs-6 text-muted">/ {totalTopics}</span></h3>
            <div className="d-flex justify-content-between" style={{ fontSize: '0.75rem' }}>
              <span className="text-success fw-bold">✅ {lecturesCompletedCount} Done</span>
              <span className="text-danger fw-bold">🔴 {lecturesPendingCount} Pending</span>
            </div>
          </div>
        </div>

        {/* 📝 Notes Making Card */}
        <div className="col-6 col-md-4 col-xl-2">
          <div 
            className={`card border-0 shadow-sm rounded-3 h-100 p-3 hover-lift cursor-pointer ${
              notesPendingCount > 0 ? 'border-danger blinking-pending-card' : 'bg-white'
            }`}
            onClick={() => setSelectedTab('notes')}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold" style={{ fontSize: '0.8rem' }}>📝 Notes</span>
              <MdDescription className="text-warning" size={22} />
            </div>
            <h3 className="fw-bold text-dark mb-1">{notesCompletedCount} <span className="fs-6 text-muted">/ {totalTopics}</span></h3>
            <div className="d-flex justify-content-between" style={{ fontSize: '0.75rem' }}>
              <span className="text-success fw-bold">✅ {notesCompletedCount} Done</span>
              <span className={`fw-bold ${notesPendingCount > 0 ? 'blinking-pending-text' : 'text-muted'}`}>
                🔴 {notesPendingCount} Pending
              </span>
            </div>
          </div>
        </div>

        {/* 🔄 Revision Card */}
        <div className="col-6 col-md-4 col-xl-2">
          <div 
            className={`card border-0 shadow-sm rounded-3 h-100 p-3 hover-lift cursor-pointer ${selectedTab === 'revision' ? 'ring-2 ring-primary bg-primary-subtle' : 'bg-white'}`}
            onClick={() => setSelectedTab('revision')}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold" style={{ fontSize: '0.8rem' }}>🔄 Revision</span>
              <MdAutorenew className="text-info" size={22} />
            </div>
            <h3 className="fw-bold text-dark mb-1">{revisionCompletedCount} <span className="fs-6 text-muted">/ {revisionRequiredTopics.length}</span></h3>
            <div className="d-flex justify-content-between" style={{ fontSize: '0.72rem' }}>
              <span className="text-danger fw-bold">🔴 {revisionPendingCount} Pending</span>
              <span className="text-secondary fw-semibold">⭕ {revisionSkippedCount} Skipped</span>
            </div>
          </div>
        </div>

        {/* 🔴 Pending Tasks Card */}
        <div className="col-6 col-md-4 col-xl-2">
          <div 
            className={`card border-0 shadow-sm rounded-3 h-100 p-3 hover-lift cursor-pointer ${
              pendingTasksList.length > 0 ? 'bg-danger text-white blinking-pending-card' : 'bg-white'
            }`}
            onClick={() => setSelectedTab('pending')}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className={`fw-semibold ${pendingTasksList.length > 0 ? 'text-white' : 'text-muted'}`} style={{ fontSize: '0.8rem' }}>🔴 Pending Tasks</span>
              <MdWarning className={pendingTasksList.length > 0 ? 'text-white blinking-pending-text' : 'text-danger'} size={22} />
            </div>
            <h3 className={`fw-bold mb-1 ${pendingTasksList.length > 0 ? 'text-white' : 'text-dark'}`}>{pendingTasksList.length}</h3>
            <small className={pendingTasksList.length > 0 ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.75rem' }}>
              {pendingTasksList.length > 0 ? 'Action required!' : 'All clear 🎉'}
            </small>
          </div>
        </div>

        {/* 🎉 Completed Topics Card */}
        <div className="col-6 col-md-4 col-xl-2">
          <div 
            className={`card border-0 shadow-sm rounded-3 h-100 p-3 hover-lift cursor-pointer ${selectedTab === 'completed' ? 'ring-2 ring-success bg-success-subtle' : 'bg-white'}`}
            onClick={() => setSelectedTab('completed')}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted fw-semibold" style={{ fontSize: '0.8rem' }}>🎉 Completed Topics</span>
              <MdCheckCircle className="text-success" size={22} />
            </div>
            <h3 className="fw-bold text-success mb-1">{completedTopicsCount}</h3>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              100% Finished Topics
            </small>
          </div>
        </div>

      </div>

      {/* Tabs Bar & Filters */}
      <div className="card border-0 shadow-sm rounded-3 bg-white p-3 mb-4">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          
          {/* Navigation Pill Tabs */}
          <ul className="nav nav-pills gap-1">
            <li className="nav-item">
              <button 
                className={`nav-link rounded-2 fw-semibold py-2 px-3 ${selectedTab === 'all' ? 'active bg-primary' : 'text-dark'}`}
                onClick={() => setSelectedTab('all')}
              >
                All Topics ({totalTopics})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-2 fw-semibold py-2 px-3 ${selectedTab === 'lectures' ? 'active bg-primary' : 'text-dark'}`}
                onClick={() => setSelectedTab('lectures')}
              >
                🎥 Lectures ({totalTopics})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-2 fw-semibold py-2 px-3 ${selectedTab === 'notes' ? 'active bg-warning text-dark' : 'text-dark'}`}
                onClick={() => setSelectedTab('notes')}
              >
                📝 Notes ({notesPendingCount > 0 ? `🔴 ${notesPendingCount} Pending` : 'All Done'})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-2 fw-semibold py-2 px-3 ${selectedTab === 'revision' ? 'active bg-info text-white' : 'text-dark'}`}
                onClick={() => setSelectedTab('revision')}
              >
                🔄 Revision ({revisionPendingCount > 0 ? `🔴 ${revisionPendingCount} Pending` : 'All Done'})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-2 fw-semibold py-2 px-3 ${selectedTab === 'pending' ? 'active bg-danger text-white' : 'text-danger'}`}
                onClick={() => setSelectedTab('pending')}
              >
                🔴 Pending Tasks Hub ({pendingTasksList.length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link rounded-2 fw-semibold py-2 px-3 ${selectedTab === 'completed' ? 'active bg-success text-white' : 'text-success'}`}
                onClick={() => setSelectedTab('completed')}
              >
                🎉 Completed Topics ({completedTopicsCount})
              </button>
            </li>
          </ul>

          {/* Subject Filter Dropdown */}
          <div className="d-flex align-items-center gap-2">
            <MdFilterList className="text-muted" size={20} />
            <select 
              className="form-select form-select-sm rounded-2 fw-semibold border-secondary-subtle"
              style={{ minWidth: '200px' }}
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="ALL">All Subjects ({subjects.length})</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Subject Quick Chips Bar */}
      {subjects.length > 0 && (
        <div className="d-flex align-items-center gap-2 mb-4 overflow-auto pb-2">
          <span className="text-muted fw-semibold me-2" style={{ fontSize: '0.85rem' }}>Subjects:</span>
          <button 
            className={`btn btn-sm rounded-pill fw-semibold px-3 ${selectedSubjectId === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setSelectedSubjectId('ALL')}
          >
            All Subjects ({subjects.length})
          </button>
          {subjects.map(sub => (
            <div key={sub.id} className="d-flex align-items-center">
              <button 
                className={`btn btn-sm rounded-pill fw-semibold px-3 ${selectedSubjectId === sub.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedSubjectId(sub.id)}
              >
                📚 {sub.name}
              </button>
              <button 
                className="btn btn-link btn-sm text-danger p-0 ms-1"
                title={`Delete Subject ${sub.name}`}
                onClick={() => handleDeleteSubject(sub.id, sub.name)}
              >
                <MdDeleteOutline size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {selectedTab === 'pending' ? (
        <PendingTasksCard pendingTasks={pendingTasksList} onRefresh={loadStoreData} />
      ) : filteredTopics.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-3 bg-white p-5 text-center my-4">
          <div className="fs-1 text-muted mb-2">📚</div>
          <h5 className="fw-bold text-dark">No topics found</h5>
          <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
            {subjects.length === 0 
              ? 'Start by creating your first Subject!' 
              : 'Add a topic to this subject to begin tracking Lecture, Notes, and Revision!'}
          </p>
          <div className="d-flex justify-content-center gap-2">
            {subjects.length === 0 && (
              <button className="btn btn-primary fw-bold" onClick={() => setShowAddSubjectModal(true)}>
                + Add First Subject
              </button>
            )}
            {subjects.length > 0 && (
              <button className="btn btn-primary fw-bold" onClick={() => setShowAddTopicModal(true)}>
                + Add Topic
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredTopics.map((topic) => (
            <div className="col-12 col-xl-6" key={topic.id}>
              <TopicCard 
                topic={topic}
                subjectName={getSubjectName(topic.subjectId)}
                onRefresh={loadStoreData}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddSubjectModal 
        show={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        onRefresh={loadStoreData}
      />

      <AddTopicModal 
        show={showAddTopicModal}
        onClose={() => setShowAddTopicModal(false)}
        subjects={subjects}
        defaultSubjectId={selectedSubjectId !== 'ALL' ? selectedSubjectId : ''}
        onRefresh={loadStoreData}
      />

    </div>
  );
};

export default StudyTracker;
