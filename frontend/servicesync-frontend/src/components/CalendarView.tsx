import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin } from 'lucide-react';
import { WorkOrder } from '../types';

interface CalendarViewProps {
  workOrders: WorkOrder[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onWorkOrderSelect?: (workOrder: WorkOrder) => void;
  onWorkOrderMove?: (workOrder: WorkOrder, techId: number, timeSlot: string) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  workOrders: WorkOrder[];
}

const CalendarView: React.FC<CalendarViewProps> = ({
  workOrders,
  currentDate,
  onDateChange,
  onWorkOrderSelect,
  onWorkOrderMove
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  // Generate calendar days for the current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first day of the week containing the first day of the month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on the last day of the week containing the last day of the month
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let current = new Date(startDate);
    while (current <= endDate) {
      const dayWorkOrders = workOrders.filter(wo => {
        if (!wo.scheduled_date) return false;
        const woDate = new Date(wo.scheduled_date);
        return woDate.toDateString() === current.toDateString();
      });
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === today.toDateString(),
        workOrders: dayWorkOrders
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    setCalendarDays(days);
  }, [currentDate, workOrders]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    onDateChange(newDate);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateChange(date);
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'open': return '#10B981';
      case 'assigned': return '#3B82F6';
      case 'in progress': return '#F59E0B';
      case 'suspended': return '#EF4444';
      case 'complete': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const formatTimeSlot = (timeSlot?: string): string => {
    if (!timeSlot) return '';
    return timeSlot.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/i, '$1:$2 $3');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'white',
      padding: '1rem'
    }}>
      {/* Calendar Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1F2937',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Calendar size={24} />
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigateMonth(-1)}
            style={{
              padding: '0.5rem',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronLeft size={20} />
          </button>
          
          <button
            onClick={() => onDateChange(new Date())}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Today
          </button>
          
          <button
            onClick={() => navigateMonth(1)}
            style={{
              padding: '0.5rem',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Day Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          backgroundColor: '#E5E7EB',
          marginBottom: '1px'
        }}>
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                backgroundColor: '#F9FAFB',
                padding: '0.75rem',
                textAlign: 'center',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          backgroundColor: '#E5E7EB',
          flex: 1
        }}>
          {calendarDays.map((day, index) => (
            <div
              key={index}
              style={{
                backgroundColor: day.isCurrentMonth ? 'white' : '#F9FAFB',
                padding: '0.5rem',
                minHeight: '120px',
                cursor: 'pointer',
                border: day.isToday ? '2px solid #3B82F6' : 'none',
                position: 'relative'
              }}
              onClick={() => handleDateClick(day.date)}
            >
              {/* Date Number */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: day.isToday ? '600' : '500',
                color: day.isCurrentMonth ? '#1F2937' : '#9CA3AF',
                marginBottom: '0.25rem'
              }}>
                {day.date.getDate()}
              </div>

              {/* Work Orders */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.25rem',
                maxHeight: '80px',
                overflow: 'hidden'
              }}>
                {day.workOrders.slice(0, 3).map((workOrder, woIndex) => (
                  <div
                    key={workOrder.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onWorkOrderSelect?.(workOrder);
                    }}
                    style={{
                      backgroundColor: getStatusColor(workOrder.status),
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      minHeight: '20px'
                    }}
                  >
                    <Clock size={10} />
                    <span style={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {workOrder.wo_number}
                    </span>
                  </div>
                ))}
                
                {day.workOrders.length > 3 && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    +{day.workOrders.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#F9FAFB',
          borderRadius: '0.5rem',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1F2937',
            margin: '0 0 0.5rem 0'
          }}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {workOrders
              .filter(wo => wo.scheduled_date === selectedDate.toISOString().split('T')[0])
              .sort((a, b) => (a.scheduled_time_slot || '').localeCompare(b.scheduled_time_slot || ''))
              .map(workOrder => (
                <div
                  key={workOrder.id}
                  onClick={() => onWorkOrderSelect?.(workOrder)}
                  style={{
                    backgroundColor: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    border: `2px solid ${getStatusColor(workOrder.status)}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      color: '#1F2937'
                    }}>
                      {workOrder.wo_number}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6B7280'
                    }}>
                      {formatTimeSlot(workOrder.scheduled_time_slot)}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#374151',
                    marginBottom: '0.25rem'
                  }}>
                    {workOrder.customer_name}
                  </div>
                  
                  {workOrder.tech_first_name && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <User size={12} />
                      {workOrder.tech_first_name} {workOrder.tech_last_name}
                    </div>
                  )}
                </div>
              ))}
          </div>
          
          {workOrders.filter(wo => wo.scheduled_date === selectedDate.toISOString().split('T')[0]).length === 0 && (
            <p style={{
              color: '#6B7280',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              textAlign: 'center',
              margin: '1rem 0'
            }}>
              No work orders scheduled for this date.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;