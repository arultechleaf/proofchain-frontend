'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronRight, Loader2, Check, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';
import { deliveriesApi, companiesApi } from '@/lib/api';
import type { Company } from '@/types';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

interface DeliveryForm {
  deliveryReference: string;
  receiverCompanyId: string;
  description: string;
  quantity: number;
  metadata?: string;
}

const STEPS = ['Details', 'Review', 'Confirm'];

export default function CreateDeliveryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<DeliveryForm>();
  const formValues = watch();

  useEffect(() => {
    companiesApi.list().then(r => {
      setCompanies((r.data.data ?? []).filter((c: Company) => c.organizationType === 'receiver'));
    }).catch(() => {});
  }, []);

  const selectedCompany = companies.find(c => c.id === formValues.receiverCompanyId);

  const onSubmit = async (data: DeliveryForm) => {
    if (step < 1) { setStep(1); return; }
    setIsLoading(true);
    setError('');
    try {
      let metadata: Record<string, unknown> | undefined;
      if (data.metadata?.trim()) {
        try { metadata = JSON.parse(data.metadata); } catch { setError('Metadata must be valid JSON'); setIsLoading(false); return; }
      }
      const res = await deliveriesApi.create({
        deliveryReference: data.deliveryReference,
        receiverCompanyId: data.receiverCompanyId,
        description: data.description,
        quantity: Number(data.quantity),
        metadata,
      });
      setResult(res.data.data);
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create delivery');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/deliveries" className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Create Delivery</h1>
          <p className="text-slate-500 text-sm">Register a new delivery with blockchain proof</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium border-2 transition-all ${
              i < step ? 'bg-blue-600 border-blue-600 text-white' :
              i === step ? 'border-blue-500 text-blue-400' :
              'border-slate-700 text-slate-600'
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`ml-2 text-xs font-medium ${i === step ? 'text-blue-400' : i < step ? 'text-slate-300' : 'text-slate-600'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-blue-600' : 'bg-slate-800'}`} />}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="glass-card rounded-xl p-6">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {step === 2 && result ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Delivery Created!</h2>
            <p className="text-slate-400 text-sm mb-6">Proof has been registered on the blockchain.</p>
            <div className="text-left space-y-3 bg-slate-900/60 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reference</span>
                <span className="text-slate-200 font-mono">{result.deliveryReference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Blockchain</span>
                <span className={`badge ${result.blockchainStatus === 'confirmed' ? 'badge-confirmed' : 'badge-pending'}`}>
                  {result.blockchainStatus}
                </span>
              </div>
              {result.payloadHash && (
                <div className="text-sm">
                  <span className="text-slate-500 block mb-1">Proof Hash (SHA-256)</span>
                  <span className="hash-display text-xs break-all">{result.payloadHash}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Link href={`/deliveries/${result.id}`} className="btn btn-primary">View Delivery</Link>
              <Link href="/deliveries" className="btn btn-secondary">Back to List</Link>
            </div>
          </motion.div>
        ) : step === 1 ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h2 className="font-semibold text-slate-200 mb-4">Review Details</h2>
            {[
              ['Reference', formValues.deliveryReference],
              ['Receiver', selectedCompany?.name ?? formValues.receiverCompanyId],
              ['Description', formValues.description],
              ['Quantity', String(formValues.quantity)],
              ['Metadata', formValues.metadata || '(none)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-2.5 border-b border-slate-800">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200 max-w-xs text-right break-all">{v}</span>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(0)} className="btn btn-secondary flex-1">Back</button>
              <button onClick={handleSubmit(onSubmit)} disabled={isLoading} className="btn btn-primary flex-1">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4" /> Confirm & Submit</>}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="form-label">Delivery Reference *</label>
              <input className="form-input" placeholder="DEL-2024-001" {...register('deliveryReference', { required: 'Required' })} />
              {errors.deliveryReference && <p className="text-red-400 text-xs mt-1">{errors.deliveryReference.message}</p>}
            </div>
            <div>
              <label className="form-label">Receiver Organization *</label>
              <select className="form-input" {...register('receiverCompanyId', { required: 'Required' })}>
                <option value="">Select receiver...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.organizationCode})</option>)}
              </select>
              {errors.receiverCompanyId && <p className="text-red-400 text-xs mt-1">{errors.receiverCompanyId.message}</p>}
            </div>
            <div>
              <label className="form-label">Description *</label>
              <textarea className="form-input resize-none h-24" placeholder="Describe the delivery contents..." {...register('description', { required: 'Required', minLength: { value: 5, message: 'Min 5 chars' } })} />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <label className="form-label">Quantity *</label>
              <input type="number" className="form-input" min="1" placeholder="100" {...register('quantity', { required: 'Required', min: { value: 1, message: 'Min 1' } })} />
              {errors.quantity && <p className="text-red-400 text-xs mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="form-label">Metadata (JSON, optional)</label>
              <textarea className="form-input font-mono text-xs resize-none h-20" placeholder='{"weight": "10kg", "fragile": true}' {...register('metadata')} />
            </div>
            <button type="submit" className="btn btn-primary w-full justify-center py-2.5">
              Review Details <ChevronRight className="w-4 h-4" />
            </button>
          </motion.form>
        )}
      </div>

      {/* Info panel */}
      <div className="glass-card rounded-xl p-4 border border-blue-500/10">
        <div className="flex gap-3 items-start">
          <Package className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-300 mb-1">How it works</p>
            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
              <li>Your delivery is saved to the secure MySQL database</li>
              <li>A SHA-256 hash of the canonicalized payload is calculated</li>
              <li>The hash is registered on the Hyperledger Besu blockchain</li>
              <li>The transaction hash serves as immutable proof of the delivery record</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
