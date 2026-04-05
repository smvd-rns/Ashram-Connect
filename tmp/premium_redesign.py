import os

file_path = r'c:\Users\Admin\Documents\BC-Class\yt-lectures-final\src\components\AttendanceTracing.tsx'

with open(file_path, 'rb') as f:
    raw = f.read()

# Normalize to LF for processing
content = raw.decode('utf-8').replace('\r\n', '\n').replace('\r', '\n')
lines = content.split('\n')

# Find line 584 (0-indexed 583) - start of harinam conditional in tbody
# The cell ends at line 622 (0-indexed 621)
start_idx = 583
end_idx = 621 # 622 in 1-indexed

# Redesigned premium Harinam chip UI
NEW_REDESIGN = """                                     {selectedMachineId === 'harinam_virtual' ? (
                                         <td className="px-6 py-4 last:rounded-r-2xl border-l border-slate-100/50 bg-slate-50/30" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-3">
                                              <div className="flex items-center gap-1.5 p-1.5 bg-white/80 rounded-2xl border border-slate-200/60 shadow-sm backdrop-blur-sm">
                                                {[
                                                  { id: 'h7am', label: '7:00 AM', val: 30, color: 'emerald' },
                                                  { id: 'h740am', label: '7:40 AM', val: 30, color: 'teal' },
                                                  { id: 'hpdc', label: 'PDC', val: 90, color: 'indigo' }
                                                ].map(opt => {
                                                  const isActive = (row.logs[0]?.[opt.id] || 0) > 0;
                                                  return (
                                                    <button
                                                      key={opt.id}
                                                      onClick={(e) => { e.stopPropagation(); handleMarkHarinam(row.user.email, row.date, opt.id, isActive ? 0 : opt.val); }}
                                                      className={`h-10 px-5 rounded-[0.9rem] font-black text-[11px] uppercase tracking-wider transition-all duration-300 select-none border-2 ${
                                                        isActive
                                                          ? 'bg-gradient-to-br from-emerald-400 to-teal-600 border-white/20 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4)] scale-105 active:scale-95'
                                                          : 'bg-white border-transparent text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 active:scale-95'
                                                      }`}
                                                    >
                                                      {opt.label}
                                                    </button>
                                                  );
                                                })}
                                                <div className="w-px h-6 bg-slate-200 mx-1" />
                                                <div className="flex items-center gap-2 px-3 h-10 rounded-[0.9rem] bg-amber-50/50 border-2 border-amber-100/50 group/dur transition-all hover:border-amber-200">
                                                  <span className="text-[10px] font-black text-amber-600/60">+</span>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    defaultValue={row.logs[0]?.hcustom_mins || 0}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onBlur={(e) => handleMarkHarinam(row.user.email, row.date, 'hcustom_mins', parseInt(e.target.value) || 0)}
                                                    className="w-10 bg-transparent border-none text-center font-black text-[12px] outline-none text-amber-700 tabular-nums placeholder:text-amber-200"
                                                  />
                                                  <span className="text-[10px] font-black text-amber-600/60">m</span>
                                                </div>
                                              </div>
                                            </div>
                                         </td>"""

new_section_lines = NEW_REDESIGN.split('\n')

# Build result
result_lines = lines[:start_idx] + new_section_lines + lines[end_idx+1:]
result = '\n'.join(result_lines)

with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(result)

print("SAVED PREMIUM REDESIGN SUCCESSFULLY")
"""
