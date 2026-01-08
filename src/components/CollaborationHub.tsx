/**
 * Collaboration Hub Component
 * 
 * Multi-user task assignment, team management, and real-time collaboration
 * features for coordinating organizing campaigns across coalitions.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  MessageSquare,
  CheckSquare,
  Calendar,
  Bell,
  Send,
  Circle,
  Clock,
  Target,
  Shield,
  Zap,
  DollarSign,
  Filter,
  Plus,
  MoreHorizontal,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: 'organizer' | 'researcher' | 'legal' | 'analyst' | 'coordinator';
  organization: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  tasksAssigned: number;
  tasksCompleted: number;
  lastActive: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string | null;
  creator: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  agentType?: 'anomaly' | 'compliance' | 'subsidy' | 'ownership';
  dueDate: number;
  createdAt: number;
  comments: number;
  facility?: string;
}

interface Message {
  id: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'task_update';
}

const demoMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'coordinator',
    organization: 'Tech Workers Coalition',
    avatar: 'SC',
    status: 'online',
    tasksAssigned: 5,
    tasksCompleted: 12,
    lastActive: Date.now(),
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'researcher',
    organization: 'UPROSE',
    avatar: 'MJ',
    status: 'online',
    tasksAssigned: 3,
    tasksCompleted: 8,
    lastActive: Date.now() - 300000,
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    role: 'legal',
    organization: 'CODE-CWA',
    avatar: 'ER',
    status: 'away',
    tasksAssigned: 2,
    tasksCompleted: 15,
    lastActive: Date.now() - 1800000,
  },
  {
    id: '4',
    name: 'David Kim',
    role: 'analyst',
    organization: 'Jobs With Justice',
    avatar: 'DK',
    status: 'online',
    tasksAssigned: 4,
    tasksCompleted: 6,
    lastActive: Date.now() - 60000,
  },
  {
    id: '5',
    name: 'Angela Martinez',
    role: 'organizer',
    organization: 'TWC Local 1001',
    avatar: 'AM',
    status: 'offline',
    tasksAssigned: 1,
    tasksCompleted: 20,
    lastActive: Date.now() - 7200000,
  },
];

const demoTasks: Task[] = [
  {
    id: '1',
    title: 'Verify Meta Prineville job creation claims',
    description: 'Cross-reference BLS data with company announcements. Deadline approaching.',
    assignee: '1',
    creator: '2',
    priority: 'critical',
    status: 'in_progress',
    agentType: 'compliance',
    dueDate: Date.now() + 86400000 * 3,
    createdAt: Date.now() - 86400000 * 2,
    comments: 7,
    facility: 'Meta Prineville',
  },
  {
    id: '2',
    title: 'Document AWS Richmond workforce reduction evidence',
    description: 'Collect LinkedIn data, news articles, and WARN notices for legal review.',
    assignee: '3',
    creator: '1',
    priority: 'high',
    status: 'review',
    agentType: 'anomaly',
    dueDate: Date.now() + 86400000 * 5,
    createdAt: Date.now() - 86400000,
    comments: 12,
    facility: 'AWS Richmond',
  },
  {
    id: '3',
    title: 'Analyze Delaware shell company network',
    description: 'Map corporate structures for Switch Inc subsidiaries.',
    assignee: '4',
    creator: '1',
    priority: 'medium',
    status: 'pending',
    agentType: 'ownership',
    dueDate: Date.now() + 86400000 * 7,
    createdAt: Date.now() - 86400000 * 3,
    comments: 3,
  },
  {
    id: '4',
    title: 'Calculate potential clawback for Google Oregon',
    description: 'Review subsidy agreement terms and calculate eligible clawback amounts.',
    assignee: null,
    creator: '2',
    priority: 'medium',
    status: 'pending',
    agentType: 'subsidy',
    dueDate: Date.now() + 86400000 * 10,
    createdAt: Date.now() - 86400000 * 5,
    comments: 1,
    facility: 'Google Oregon',
  },
  {
    id: '5',
    title: 'Prepare coalition briefing on Q3 findings',
    description: 'Summarize all compliance gaps for upcoming coalition meeting.',
    assignee: '1',
    creator: '3',
    priority: 'high',
    status: 'in_progress',
    dueDate: Date.now() + 86400000 * 2,
    createdAt: Date.now() - 86400000 * 4,
    comments: 8,
  },
];

const demoMessages: Message[] = [
  {
    id: '1',
    sender: '1',
    senderName: 'Sarah Chen',
    content: 'Just got the latest BLS data for Q3. Meta Prineville is looking worse than we thought.',
    timestamp: Date.now() - 300000,
    type: 'message',
  },
  {
    id: '2',
    sender: '2',
    senderName: 'Marcus Johnson',
    content: 'The anomaly agent flagged a significant workforce reduction at AWS Richmond. We should prioritize this.',
    timestamp: Date.now() - 600000,
    type: 'message',
  },
  {
    id: '3',
    sender: 'system',
    senderName: 'System',
    content: 'Elena Rodriguez moved "Document AWS Richmond evidence" to Review',
    timestamp: Date.now() - 900000,
    type: 'task_update',
  },
  {
    id: '4',
    sender: '3',
    senderName: 'Elena Rodriguez',
    content: 'The evidence chain is looking solid for the Meta case. Ready for legal review.',
    timestamp: Date.now() - 1200000,
    type: 'message',
  },
  {
    id: '5',
    sender: 'system',
    senderName: 'System',
    content: 'AI Agent detected potential shell company network - assigned to David Kim',
    timestamp: Date.now() - 1800000,
    type: 'system',
  },
];

const roleColors: Record<string, string> = {
  coordinator: 'bg-purple-100 text-purple-700',
  researcher: 'bg-blue-100 text-blue-700',
  legal: 'bg-green-100 text-green-700',
  analyst: 'bg-yellow-100 text-yellow-700',
  organizer: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

const agentIcons: Record<string, React.ReactNode> = {
  anomaly: <Zap className="w-4 h-4 text-yellow-500" />,
  compliance: <Shield className="w-4 h-4 text-blue-500" />,
  subsidy: <DollarSign className="w-4 h-4 text-green-500" />,
  ownership: <Target className="w-4 h-4 text-orange-500" />,
};

export const CollaborationHub: React.FC = () => {
  const [members] = useState<TeamMember[]>(demoMembers);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [newMessage, setNewMessage] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);

  const currentUser = members[0]; // Simulate logged in user

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'mine') return task.assignee === currentUser.id;
    if (taskFilter === 'unassigned') return task.assignee === null;
    return true;
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const message: Message = {
      id: `${Date.now()}`,
      sender: currentUser.id,
      senderName: currentUser.name,
      content: newMessage,
      timestamp: Date.now(),
      type: 'message',
    };
    setMessages(prev => [message, ...prev]);
    setNewMessage('');
  };

  const handleAssignTask = (taskId: string, memberId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, assignee: memberId } : task
    ));
    setShowAssignModal(null);
    
    // Add system message
    const assignee = members.find(m => m.id === memberId);
    const task = tasks.find(t => t.id === taskId);
    if (assignee && task) {
      const message: Message = {
        id: `${Date.now()}`,
        sender: 'system',
        senderName: 'System',
        content: `${currentUser.name} assigned "${task.title}" to ${assignee.name}`,
        timestamp: Date.now(),
        type: 'task_update',
      };
      setMessages(prev => [message, ...prev]);
    }
  };

  const getMember = (id: string | null) => members.find(m => m.id === id);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const formatDue = (timestamp: number) => {
    const diff = timestamp - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: 'text-red-600' };
    if (days === 0) return { text: 'Due today', color: 'text-orange-600' };
    if (days === 1) return { text: 'Due tomorrow', color: 'text-yellow-600' };
    return { text: `${days}d left`, color: 'text-gray-600' };
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-violet-600" />
            Coalition Collaboration Hub
          </h1>
          <p className="text-gray-600 mt-1">
            Coordinate campaigns across organizations with real-time task management
          </p>
        </div>
        <button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Team Members Sidebar */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team ({members.length})
              </span>
              <span className="text-xs text-green-600">
                {members.filter(m => m.status === 'online').length} online
              </span>
            </h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-medium">
                        {member.avatar}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColors[member.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{member.name}</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[member.role]}`}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{member.organization}</span>
                    <span>{member.tasksAssigned} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks Panel */}
        <div className="col-span-5">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Tasks ({filteredTasks.length})
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {['all', 'mine', 'unassigned'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTaskFilter(filter as typeof taskFilter)}
                        className={`px-3 py-1 text-xs rounded-md capitalize ${
                          taskFilter === filter
                            ? 'bg-white shadow text-gray-900'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <button className="p-1.5 text-violet-600 hover:bg-violet-50 rounded">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {filteredTasks.map((task) => {
                const assignee = getMember(task.assignee);
                const dueInfo = formatDue(task.dueDate);
                return (
                  <div key={task.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {task.agentType && agentIcons[task.agentType]}
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                          <span className={`text-xs ${dueInfo.color}`}>
                            {dueInfo.text}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                        {task.facility && (
                          <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            📍 {task.facility}
                          </span>
                        )}
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">
                              {assignee.avatar}
                            </div>
                            <span className="text-sm text-gray-600">{assignee.name}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAssignModal(task.id)}
                            className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                          >
                            <UserPlus className="w-4 h-4" />
                            Assign
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {task.comments}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'review' ? 'bg-purple-100 text-purple-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Assignment Modal */}
                    {showAssignModal === task.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-2">Assign to:</div>
                        <div className="space-y-1">
                          {members.map((member) => (
                            <button
                              key={member.id}
                              onClick={() => handleAssignTask(task.id, member.id)}
                              className="w-full p-2 rounded hover:bg-white flex items-center gap-2 text-left"
                            >
                              <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">
                                {member.avatar}
                              </div>
                              <span className="text-sm">{member.name}</span>
                              <span className={`ml-auto w-2 h-2 rounded-full ${statusColors[member.status]}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity Feed & Chat */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Team Chat
              </h3>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === 'message' ? (
                    <div className={`flex gap-3 ${msg.sender === currentUser.id ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center flex-shrink-0">
                        {getMember(msg.sender)?.avatar || '?'}
                      </div>
                      <div className={`max-w-[70%] ${msg.sender === currentUser.id ? 'text-right' : ''}`}>
                        <div className="text-xs text-gray-500 mb-1">
                          {msg.senderName} • {formatTime(msg.timestamp)}
                        </div>
                        <div className={`p-3 rounded-lg ${
                          msg.sender === currentUser.id
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                      {msg.type === 'task_update' ? (
                        <CheckSquare className="w-3 h-3" />
                      ) : (
                        <Bell className="w-3 h-3" />
                      )}
                      <span>{msg.content}</span>
                      <span>• {formatTime(msg.timestamp)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationHub;
