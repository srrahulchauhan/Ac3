const STORAGE_KEY = 'studyTrackerData_v1';

const initialData = {
  subjects: [
    { id: 'sub_1', name: 'Computer Fundamentals', description: 'Basics of hardware, software, CPU architecture and memory', createdAt: new Date().toISOString() },
    { id: 'sub_2', name: 'Database Management Systems (DBMS)', description: 'Relational databases, SQL, indexing, and normalization', createdAt: new Date().toISOString() },
    { id: 'sub_3', name: 'Operating Systems', description: 'Processes, threads, memory management, and scheduling', createdAt: new Date().toISOString() },
  ],
  topics: [
    {
      id: 'top_1',
      subjectId: 'sub_1',
      name: 'Architecture & CPU Basics',
      lectureCompleted: true,
      notesCompleted: false, // Pending 🔴
      revisionRequired: true,
      revisionCompleted: false, // Pending 🔴
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'top_2',
      subjectId: 'sub_1',
      name: 'Memory Hierarchy & RAM',
      lectureCompleted: true,
      notesCompleted: true,
      revisionRequired: true,
      revisionCompleted: true, // Completed 🎉
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'top_3',
      subjectId: 'sub_2',
      name: 'SQL Queries & Joins',
      lectureCompleted: true,
      notesCompleted: true,
      revisionRequired: false, // Excluded from completion
      revisionCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'top_4',
      subjectId: 'sub_2',
      name: 'Normalization (1NF, 2NF, 3NF, BCNF)',
      lectureCompleted: false, // Pending 🔴
      notesCompleted: false, // Pending 🔴
      revisionRequired: true,
      revisionCompleted: false, // Pending 🔴
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'top_5',
      subjectId: 'sub_3',
      name: 'Process Scheduling Algorithms',
      lectureCompleted: true,
      notesCompleted: false, // Pending 🔴
      revisionRequired: true,
      revisionCompleted: false, // Pending 🔴
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

export const studyStore = {
  getData: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
        return initialData;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load study store data', e);
      return initialData;
    }
  },

  saveData: (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event('studyStoreUpdated'));
    } catch (e) {
      console.error('Failed to save study store data', e);
    }
  },

  addSubject: (name, description = '') => {
    const data = studyStore.getData();
    const newSubject = {
      id: 'sub_' + Date.now(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString()
    };
    data.subjects.push(newSubject);
    studyStore.saveData(data);
    return newSubject;
  },

  deleteSubject: (subjectId) => {
    const data = studyStore.getData();
    data.subjects = data.subjects.filter(s => s.id !== subjectId);
    data.topics = data.topics.filter(t => t.subjectId !== subjectId);
    studyStore.saveData(data);
  },

  addTopic: (subjectId, name, revisionRequired = true) => {
    const data = studyStore.getData();
    const newTopic = {
      id: 'top_' + Date.now(),
      subjectId,
      name: name.trim(),
      lectureCompleted: false,
      notesCompleted: false,
      revisionRequired: Boolean(revisionRequired),
      revisionCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.topics.push(newTopic);
    studyStore.saveData(data);
    return newTopic;
  },

  deleteTopic: (topicId) => {
    const data = studyStore.getData();
    data.topics = data.topics.filter(t => t.id !== topicId);
    studyStore.saveData(data);
  },

  // CRITICAL RULE: Independent task toggle. Toggling 'lecture' ONLY changes lectureCompleted.
  toggleTask: (topicId, taskType) => {
    const data = studyStore.getData();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) return;

    if (taskType === 'lecture') {
      topic.lectureCompleted = !topic.lectureCompleted;
    } else if (taskType === 'notes') {
      topic.notesCompleted = !topic.notesCompleted;
    } else if (taskType === 'revision') {
      topic.revisionCompleted = !topic.revisionCompleted;
    }
    topic.updatedAt = new Date().toISOString();
    studyStore.saveData(data);
  },

  // Toggle whether Revision is required for completion calculation
  setRevisionRequired: (topicId, isRequired) => {
    const data = studyStore.getData();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) return;

    topic.revisionRequired = Boolean(isRequired);
    topic.updatedAt = new Date().toISOString();
    studyStore.saveData(data);
  },

  // Final Success Condition check:
  // Lecture ✅ + Notes ✅ + (Revision ✅ OR Revision Skipped)
  isTopicCompleted: (topic) => {
    if (!topic) return false;
    const lectureDone = Boolean(topic.lectureCompleted);
    const notesDone = Boolean(topic.notesCompleted);
    const revisionDone = !topic.revisionRequired || Boolean(topic.revisionCompleted);

    return lectureDone && notesDone && revisionDone;
  },

  getTopicStatus: (topic) => {
    return studyStore.isTopicCompleted(topic) ? 'COMPLETED' : 'INCOMPLETE';
  },

  getPendingTasks: () => {
    const data = studyStore.getData();
    const pendingList = [];

    const subjectMap = {};
    data.subjects.forEach(s => { subjectMap[s.id] = s.name; });

    data.topics.forEach(topic => {
      const subjectName = subjectMap[topic.subjectId] || 'General Subject';

      // Check Lecture
      if (!topic.lectureCompleted) {
        pendingList.push({
          id: `${topic.id}_lecture`,
          topicId: topic.id,
          topicName: topic.name,
          subjectId: topic.subjectId,
          subjectName,
          taskType: 'lecture',
          taskLabel: '🎥 Lecture Pending',
          icon: '🎥',
          updatedAt: topic.updatedAt
        });
      }

      // Check Notes
      if (!topic.notesCompleted) {
        pendingList.push({
          id: `${topic.id}_notes`,
          topicId: topic.id,
          topicName: topic.name,
          subjectId: topic.subjectId,
          subjectName,
          taskType: 'notes',
          taskLabel: '📝 Notes Making Pending',
          icon: '📝',
          updatedAt: topic.updatedAt
        });
      }

      // Check Revision (only if revisionRequired is true and revision is incomplete)
      if (topic.revisionRequired && !topic.revisionCompleted) {
        pendingList.push({
          id: `${topic.id}_revision`,
          topicId: topic.id,
          topicName: topic.name,
          subjectId: topic.subjectId,
          subjectName,
          taskType: 'revision',
          taskLabel: '🔄 Revision Pending',
          icon: '🔄',
          updatedAt: topic.updatedAt
        });
      }
    });

    return pendingList;
  }
};
