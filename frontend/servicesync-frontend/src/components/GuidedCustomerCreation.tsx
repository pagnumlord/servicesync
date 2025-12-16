// Fixed GuidedCustomerCreation.tsx
// File: frontend/servicesync-frontend/src/components/GuidedCustomerCreation.tsx

import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface GuidedCustomerCreationProps {
  initialName?: string;
  onComplete: (customerData: any) => void;
  onCancel: () => void;
}

const GuidedCustomerCreation: React.FC<GuidedCustomerCreationProps> = ({
  initialName = '',
  onComplete,
  onCancel
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({
    // Basic Info
    businessName: initialName,
    businessType: '',
    
    // Contact Info
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    
    // Address
    serviceAddress: '',
    serviceCity: 'Lafayette',
    serviceState: 'IN',
    serviceZip: '',
    
    // Business Details
    billingPreferences: 'NET30',
    requiresPO: null as boolean | null, // Fixed: explicitly typed as boolean or null
    
    // Optional
    instructions: ''
  });

  const questions = [
    {
      id: 'businessName',
      question: "What's the business name?",
      type: 'text',
      placeholder: 'e.g., McDonald\'s - Creasy Lane',
      required: true
    },
    {
      id: 'businessType',
      question: "What type of business is this?",
      type: 'select',
      options: [
        { value: 'restaurant', label: 'Restaurant / Food Service' },
        { value: 'medical', label: 'Medical / Healthcare' },
        { value: 'commercial', label: 'Commercial / Office' },
        { value: 'factory', label: 'Manufacturing / Factory' },
        { value: 'retail', label: 'Retail Store' },
        { value: 'education', label: 'School / Education' },
        { value: 'other', label: 'Other' }
      ],
      required: true
    },
    {
      id: 'contactFirstName',
      question: "What's the primary contact's first name?",
      type: 'text',
      placeholder: 'e.g., John',
      required: true
    },
    {
      id: 'contactLastName',
      question: "And their last name?",
      type: 'text',
      placeholder: 'e.g., Smith',
      required: true
    },
    {
      id: 'contactPhone',
      question: "What's their phone number?",
      type: 'tel',
      placeholder: '(765) 555-0123',
      required: true
    },
    {
      id: 'contactEmail',
      question: "Email address? (Optional)",
      type: 'email',
      placeholder: 'john@business.com',
      required: false
    },
    {
      id: 'serviceAddress',
      question: "What's the service address?",
      type: 'text',
      placeholder: '123 Main Street',
      required: true
    },
    {
      id: 'serviceCity',
      question: "Which city?",
      type: 'text',
      placeholder: 'Lafayette',
      required: true
    },
    {
      id: 'serviceZip',
      question: "ZIP code?",
      type: 'text',
      placeholder: '47905',
      required: true
    },
    {
      id: 'billingPreferences',
      question: "What are their payment terms?",
      type: 'select',
      options: [
        { value: 'Due on Receipt', label: 'Due on Receipt (COD)' },
        { value: 'NET15', label: 'NET 15 Days' },
        { value: 'NET30', label: 'NET 30 Days' },
        { value: 'NET45', label: 'NET 45 Days' }
      ],
      required: true
    },
    {
      id: 'requiresPO',
      question: "Do they require purchase orders?",
      type: 'yesno',
      required: true
    },
    {
      id: 'instructions',
      question: "Any special instructions or notes? (Optional)",
      type: 'textarea',
      placeholder: 'e.g., Use back entrance, Call before arriving, etc.',
      required: false
    }
  ];

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  
  // Fixed: Check if answer is provided for required fields, handle boolean properly
  const canProceed = currentQ.required 
    ? (currentQ.type === 'yesno' 
        ? answers[currentQ.id as keyof typeof answers] !== null 
        : !!answers[currentQ.id as keyof typeof answers])
    : true;

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: value
    }));
  };

  const nextQuestion = () => {
    if (isLastQuestion) {
      // Create customer data object with proper structure
      const customerData = {
        name: answers.businessName,
        type: answers.businessType,
        primaryContactName: `${answers.contactFirstName} ${answers.contactLastName}`,
        primaryContactPhone: answers.contactPhone,
        primaryContactEmail: answers.contactEmail,
        serviceAddress: {
          line1: answers.serviceAddress,
          city: answers.serviceCity,
          state: answers.serviceState,
          zip: answers.serviceZip
        },
        billingPreferences: {
          payment_terms: answers.billingPreferences,
          requires_po: answers.requiresPO === true // Convert to boolean
        },
        notes: answers.instructions
      };
      
      console.log('📋 Customer data being sent:', customerData);
      onComplete(customerData);
    } else {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const renderInput = () => {
    const value = answers[currentQ.id as keyof typeof answers];

    switch (currentQ.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <input
            type={currentQ.type}
            value={value as string}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder={currentQ.placeholder}
            autoFocus
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.125rem',
              border: '2px solid #e5e7eb',
              borderRadius: '0.5rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            onKeyPress={(e) => e.key === 'Enter' && canProceed && nextQuestion()}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder={currentQ.placeholder}
            rows={4}
            autoFocus
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.125rem',
              border: '2px solid #e5e7eb',
              borderRadius: '0.5rem',
              outline: 'none',
              resize: 'vertical',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        );
      
      case 'select':
        return (
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
            {currentQ.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                style={{
                  padding: '1rem',
                  fontSize: '1rem',
                  border: '2px solid',
                  borderColor: value === option.value ? '#3b82f6' : '#e5e7eb',
                  backgroundColor: value === option.value ? '#eff6ff' : 'white',
                  color: value === option.value ? '#1e40af' : '#374151',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  if (value !== option.value) {
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option.value) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                {option.label}
                {value === option.value && <Check style={{ width: '1.25rem', height: '1.25rem' }} />}
              </button>
            ))}
          </div>
        );
      
      case 'yesno':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            {[
              { value: true, label: 'Yes', color: '#10b981' },
              { value: false, label: 'No', color: '#ef4444' }
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => handleAnswer(option.value)}
                style={{
                  padding: '1.5rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  border: '2px solid',
                  borderColor: value === option.value ? option.color : '#e5e7eb',
                  backgroundColor: value === option.value ? `${option.color}10` : 'white',
                  color: value === option.value ? option.color : '#374151',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (value !== option.value) {
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option.value) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                {option.label}
                {value === option.value && <Check style={{ width: '1.25rem', height: '1.25rem' }} />}
              </button>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <button
            onClick={onCancel}
            style={{ fontSize: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}
          >
            ×
          </button>
        </div>
        <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem' }}>
          <div style={{
            width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            height: '100%',
            backgroundColor: '#3b82f6',
            borderRadius: '0.25rem',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem', lineHeight: '1.2' }}>
          {currentQ.question}
        </h2>
        
        {renderInput()}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
        <button
          onClick={previousQuestion}
          disabled={currentQuestion === 0}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentQuestion === 0 ? '#f3f4f6' : '#e5e7eb',
            color: currentQuestion === 0 ? '#9ca3af' : '#374151',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
          Back
        </button>

        <button
          onClick={nextQuestion}
          disabled={!canProceed}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: !canProceed ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: !canProceed ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isLastQuestion ? 'Create Customer' : 'Next'}
          {!isLastQuestion && <ArrowRight style={{ width: '1rem', height: '1rem' }} />}
          {isLastQuestion && <Check style={{ width: '1rem', height: '1rem' }} />}
        </button>
      </div>

      {/* Helper Text */}
      {currentQ.type === 'text' && (
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
          Press Enter to continue
        </div>
      )}

      {/* Debug Info (remove in production) */}
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
        <strong>Debug:</strong> Current answer: {JSON.stringify(answers[currentQ.id as keyof typeof answers])} | Can proceed: {canProceed.toString()}
      </div>
    </div>
  );
};

export default GuidedCustomerCreation;