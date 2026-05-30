import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, CheckCircle2 } from 'lucide-react';

interface SafetyCenterModalProps {
  onAccept: () => void;
}

export function SafetyCenterModal({ onAccept }: SafetyCenterModalProps) {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-[2rem] p-6 text-white shadow-2xl"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-yellow-400/10 rounded-full mb-3 border border-yellow-400/20">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-center">Central de Segurança</h2>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          <p className="text-white font-bold opacity-80 text-xs">Bem-vindo(a) ao RodoPlay. Por favor, leia e aceite as normas operacionais abaixo para prosseguir:</p>
          
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-black text-xs">01</div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">Uso Seguro Fora de Condução</h4>
            </div>
            <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">É terminantemente proibido jogar ou ler notificações enquanto estiver conduzindo um veículo real na rodovia. O RodoPlay deve ser usado estritamente com o veículo estacionado, em momentos de repouso, pausas regulamentares ou em sala de treinamento.</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">02</div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">Idoneidade nas Respostas</h4>
            </div>
            <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">As tarefas de simulação de placas, ordem de rota e manobras de pátio devem ser executadas com dedicação individual. O uso de artifícios maliciosos, trapaças ou bots desqualifica a pontuação nacional da praça e invalida o aprendizado.</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-black text-xs">03</div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">Diretrizes do CTB e CONTRAN</h4>
            </div>
            <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">Nosso conteúdo didático é formulado de acordo com as leis do Código de Trânsito Brasileiro e resoluções federais. Embora atualizado constantemente, o RodoPlay é uma ferramenta educativa de gamificação e não substitui os manuais normativos oficiais das concessionárias ou do trânsito.</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-xs">04</div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">Preservação da Saúde e Sono</h4>
            </div>
            <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">Sua integridade física é prioridade. Mantenha rotinas de sono regulares e hidrate-se durante as jornadas. Evite usar o aplicativo excessivamente para não comprometer seus períodos mínimos de descanso obrigatórios por lei.</p>
          </div>

          <div className="pt-2 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <input 
                type="checkbox" 
                checked={checked1} 
                onChange={() => setChecked1(!checked1)}
                className="w-5 h-5 accent-yellow-400 rounded shrink-0"
              />
              <span className="text-[10px] font-bold uppercase text-white leading-snug">Declaro que li, compreendi e concordo com todas as normas operacionais acima.</span>
            </label>
            
            <button
              onClick={onAccept}
              disabled={!checked1}
              className="w-full h-12 bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg border-none"
            >
              <CheckCircle2 size={16} />
              Ciente e de Acordo
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
