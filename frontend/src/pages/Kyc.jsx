import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react';

export default function Kyc() {
  const { user } = useAuth();
  
  // Steps: 1. Personal, 2. Address, 3. Identity, 4. Review
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [existingKyc, setExistingKyc] = useState(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [docType, setDocType] = useState('PAN');
  const [docNumber, setDocNumber] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Validation Error States
  const [validationErrors, setValidationErrors] = useState({});

  const fetchKycDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/kyc/me');
      setExistingKyc(response.data);
      // Prepopulate fields in case they want to modify a draft/rejected KYC
      setFullName(response.data.full_name);
      setDob(response.data.date_of_birth);
      setAddress(response.data.address);
      setCity(response.data.city);
      setStateName(response.data.state);
      setPostalCode(response.data.postal_code);
      setDocType(response.data.identity_document_type);
      setDocNumber(response.data.identity_document_number);
    } catch (err) {
      if (err.status === 404 || (err.response && err.response.status === 404)) {
        // No KYC submitted yet
        setExistingKyc(null);
      } else {
        setError(err.message || 'Failed to fetch KYC records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchKycDetails();
    }
  }, [user]);

  const validateStep = () => {
    const errors = {};
    if (step === 1) {
      if (!fullName.trim()) errors.fullName = 'Full Name is required.';
      if (!dob.trim()) {
        errors.dob = 'Date of Birth is required.';
      } else {
        let parsedDate = null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
          parsedDate = new Date(dob);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
          const parts = dob.split('/');
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          errors.dob = 'Please enter a valid date in the format YYYY-MM-DD or DD/MM/YYYY.';
        } else {
          const today = new Date();
          if (parsedDate > today) {
            errors.dob = 'Date of Birth cannot be in the future.';
          } else if (parsedDate.getFullYear() < 1900) {
            errors.dob = 'Please enter a valid birth year after 1900.';
          }
        }
      }
    } else if (step === 2) {
      if (!address.trim()) errors.address = 'Residential Address is required.';
      if (!city.trim()) errors.city = 'City is required.';
      if (!stateName.trim()) errors.stateName = 'State is required.';
      if (!postalCode.trim()) errors.postalCode = 'Postal Code is required.';
    } else if (step === 3) {
      if (!docNumber.trim()) {
        errors.docNumber = 'Document Identifier number is required.';
      } else if (docType === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(docNumber.toUpperCase().trim())) {
        errors.docNumber = 'PAN Card must be in the format ABCDE1234F.';
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Please check the confirmation box before final submission.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      full_name: fullName,
      date_of_birth: dob,
      address,
      city,
      state: stateName,
      postal_code: postalCode,
      identity_document_type: docType,
      identity_document_number: docNumber
    };

    try {
      if (existingKyc && existingKyc.status === 'REJECTED') {
        // Update rejected KYC
        await api.put('/kyc', payload);
      } else {
        // Submit new KYC
        await api.post('/kyc', payload);
      }
      setSuccess(true);
      fetchKycDetails();
    } catch (err) {
      setError(err.message || 'KYC document submission failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => { window.location.hash = '#/dashboard'; }}
          >
            <span className="text-2xl">🏦</span>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">APEX PORTAL</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-blue-700 font-extrabold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              {user.role}
            </span>
            <button 
              onClick={() => { window.location.hash = '#/dashboard'; }}
              className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Body container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-950">KYC Verification</h1>
          <p className="text-slate-400 text-xs mt-1">Complete your KYC verification to keep your banking profile up to date.</p>
        </div>

        {/* Existing Submission status banner if any */}
        {existingKyc && (
          <div className="space-y-4">
            {existingKyc.status === 'APPROVED' && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-6 rounded-3xl flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="font-bold text-base">✓ KYC Verified</h3>
                  <p className="text-emerald-600 text-xs mt-0.5">Your banking profile compliance check is fully active and verified.</p>
                </div>
              </div>
            )}

            {existingKyc.status === 'PENDING' && (
              <div className="bg-amber-50 border border-amber-100 text-amber-700 p-6 rounded-3xl flex items-start gap-4 animate-pulse">
                <Clock className="w-8 h-8 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-bold text-base">⏳ Verification in progress</h3>
                  <p className="text-amber-600 text-xs mt-0.5">We are currently validating your document submission. Active limits are retained.</p>
                </div>
              </div>
            )}

            {existingKyc.status === 'REJECTED' && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-6 rounded-3xl flex flex-col gap-3">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
                  <div>
                    <h3 className="font-bold text-base">✗ KYC Verification Rejected</h3>
                    <p className="text-rose-600 text-xs mt-0.5">Reason: <span className="font-semibold">{existingKyc.rejection_reason || 'N/A'}</span></p>
                  </div>
                </div>
                <p className="text-xs text-rose-500 font-bold bg-white/50 p-3 rounded-xl border border-rose-100/50 mt-1">
                  Please review the information below, correct any details, and re-submit for audit approval.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form Wizard if not submitted, draft, or rejected */}
        {(!existingKyc || existingKyc.status === 'REJECTED') && !success ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            {/* Step Wizard Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              {[
                { s: 1, label: 'Personal', icon: User },
                { s: 2, label: 'Address', icon: MapPin },
                { s: 3, label: 'Identity', icon: FileText },
                { s: 4, label: 'Confirm', icon: ShieldCheck }
              ].map(st => (
                <div key={st.s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    step === st.s 
                      ? 'bg-blue-600 text-white ring-4 ring-blue-50' 
                      : step > st.s 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {st.s}
                  </div>
                  <span className={`text-xs font-bold hidden sm:inline ${
                    step === st.s ? 'text-slate-800' : 'text-slate-400'
                  }`}>{st.label}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* STEP 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Personal Details</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter name exactly as on identity document"
                      className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {validationErrors.fullName && <p className="text-rose-600 text-xs mt-1">{validationErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Date of Birth</label>
                    <input
                      type="text"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="e.g. DD/MM/YYYY or YYYY-MM-DD"
                      className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {validationErrors.dob && <p className="text-rose-600 text-xs mt-1">{validationErrors.dob}</p>}
                  </div>
                </div>
              )}

              {/* STEP 2: Address Info */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Residential Address</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Street Address</label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House number, Street name, Locality"
                      className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={2}
                    />
                    {validationErrors.address && <p className="text-rose-600 text-xs mt-1">{validationErrors.address}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {validationErrors.city && <p className="text-rose-600 text-xs mt-1">{validationErrors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">State</label>
                      <input
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="State"
                        className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {validationErrors.stateName && <p className="text-rose-600 text-xs mt-1">{validationErrors.stateName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Postal/ZIP Code</label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="Postal Code"
                        className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {validationErrors.postalCode && <p className="text-rose-600 text-xs mt-1">{validationErrors.postalCode}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Identity Info */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Identity Details</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Identity Document Type</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="PAN">PAN Card</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="VOTER_ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Document Identifier Number</label>
                    <input
                      type="text"
                      required
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    {validationErrors.docNumber && <p className="text-rose-600 text-xs mt-1">{validationErrors.docNumber}</p>}
                  </div>
                </div>
              )}

              {/* STEP 4: Review Details */}
              {step === 4 && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 font-bold">Review Details</h3>
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Legal Name</span>
                        <span className="font-semibold text-slate-800">{fullName}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Date of Birth</span>
                        <span className="font-semibold text-slate-800">{dob}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Residential Address</span>
                        <span className="font-semibold text-slate-800">{address}, {city}, {stateName} - {postalCode}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Identity Document</span>
                        <span className="font-semibold text-slate-800">{docType}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Document Number</span>
                        <span className="font-mono font-bold text-slate-900">{docNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                    <input
                      type="checkbox"
                      id="confirm-cb"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    <label htmlFor="confirm-cb" className="text-xs text-slate-600 leading-relaxed font-semibold">
                      I declare that all submitted credentials are correct. I understand this is an educational mock-up module and does not store or process real PII documents.
                    </label>
                  </div>
                </div>
              )}

              {/* Wizard Nav buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex-1 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-extrabold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-505 text-white font-extrabold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 ml-auto"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !confirmed}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    Submit KYC Verification
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : success ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Submission Successful</h3>
            <p className="text-slate-500 text-sm">
              Your KYC details have been uploaded and are currently under compliance review.
            </p>
            <button
              onClick={() => { setSuccess(false); setStep(1); }}
              className="py-2 px-6 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          /* Summary of Approved or Pending KYC details */
          existingKyc && (existingKyc.status === 'APPROVED' || existingKyc.status === 'PENDING') && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 font-bold">Submitted Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Legal Name</span>
                  <span className="font-semibold text-slate-900">{existingKyc.full_name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Date of Birth</span>
                  <span className="font-semibold text-slate-900">{existingKyc.date_of_birth}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Residential Address</span>
                  <span className="font-semibold text-slate-900">{existingKyc.address}, {existingKyc.city}, {existingKyc.state} - {existingKyc.postal_code}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Document Type</span>
                  <span className="font-semibold text-slate-900">{existingKyc.identity_document_type}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Document Identifier Number</span>
                  <span className="font-mono font-bold text-slate-900">{existingKyc.identity_document_number}</span>
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
