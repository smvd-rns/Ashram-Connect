import re

file_path = "src/components/AttendanceTracing.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace thead columns
thead_pattern = re.compile(
    r'<th className="px-4 sm:px-8 py-4 text-center text-\[9px\] sm:text-\[11px\] font-black text-slate-400 uppercase tracking-\[0\.2em\]">Biometric ID</th>.*?<th className="px-4 sm:px-8 py-4 text-center text-\[9px\] sm:text-\[11px\] font-black text-indigo-400 uppercase tracking-\[0\.2em\]">Verdict</th>',
    re.DOTALL
)

replacement_thead = """{selectedMachineId === 'harinam_virtual' ? (
                                 <>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                     7 AM
                                     {isAdmin && (
                                       <button onClick={() => handleBulkHarinam('h7am', currentPivotDate, 30)} className="block mx-auto mt-1 text-[8px] text-indigo-500 hover:text-indigo-700 underline transition-colors hover:text-indigo-900 border-none bg-transparent cursor-pointer">Select All</button>
                                     )}
                                   </th>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                     7:40 AM
                                     {isAdmin && (
                                       <button onClick={() => handleBulkHarinam('h740am', currentPivotDate, 30)} className="block mx-auto mt-1 text-[8px] text-indigo-500 hover:text-indigo-700 underline transition-colors hover:text-indigo-900 border-none bg-transparent cursor-pointer">Select All</button>
                                     )}
                                   </th>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                     PDC
                                     {isAdmin && (
                                       <button onClick={() => handleBulkHarinam('hpdc', currentPivotDate, 90)} className="block mx-auto mt-1 text-[8px] text-indigo-500 hover:text-indigo-700 underline transition-colors hover:text-indigo-900 border-none bg-transparent cursor-pointer">Select All</button>
                                     )}
                                   </th>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Custom (Mins)</th>
                                 </>
                               ) : (
                                 <>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Biometric ID</th>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Punch Date</th>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Log Time</th>
                                   <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Verdict</th>
                                 </>
                               )}"""

content, count1 = thead_pattern.subn(replacement_thead, content, count=1)
print(f"Replaced thead: {count1}")


# Replace tbody columns
tbody_pattern = re.compile(
    r'<td className="px-6 py-2 text-center text-\[10px\] font-black text-slate-400 tabular-nums">.*?<td className="px-6 py-2 last:rounded-r-2xl">.*?</td>',
    re.DOTALL
)

replacement_tbody = """{selectedMachineId === 'harinam_virtual' ? (
                                        <>
                                          <td className="px-6 py-2 text-center">
                                             <button 
                                               onClick={(e) => { e.stopPropagation(); handleMarkHarinam(row.user.email, row.date, 'h7am', (row.logs[0]?.h7am > 0) ? 0 : 30); }}
                                               className={`w-8 h-8 rounded-lg border-2 transition-all font-black text-[12px] ${row.logs[0]?.h7am > 0 ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                             >
                                               P
                                             </button>
                                          </td>
                                          <td className="px-6 py-2 text-center">
                                             <button 
                                               onClick={(e) => { e.stopPropagation(); handleMarkHarinam(row.user.email, row.date, 'h740am', (row.logs[0]?.h740am > 0) ? 0 : 30); }}
                                               className={`w-8 h-8 rounded-lg border-2 transition-all font-black text-[12px] ${row.logs[0]?.h740am > 0 ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                             >
                                               P
                                             </button>
                                          </td>
                                          <td className="px-6 py-2 text-center">
                                             <button 
                                               onClick={(e) => { e.stopPropagation(); handleMarkHarinam(row.user.email, row.date, 'hpdc', (row.logs[0]?.hpdc > 0) ? 0 : 90); }}
                                               className={`w-8 h-8 rounded-lg border-2 transition-all font-black text-[12px] ${row.logs[0]?.hpdc > 0 ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                             >
                                               P
                                             </button>
                                          </td>
                                          <td className="px-6 py-2 text-center last:rounded-r-2xl">
                                             <input 
                                               type="number" 
                                               defaultValue={row.logs[0]?.hcustom_mins || 0} 
                                               onClick={(e) => e.stopPropagation()}
                                               onBlur={(e) => handleMarkHarinam(row.user.email, row.date, 'hcustom_mins', parseInt(e.target.value) || 0)}
                                               className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-black text-[10px] outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                             />
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-6 py-2 text-center text-[10px] font-black text-slate-400 tabular-nums">
                                            <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">#{row.logs[0]?.zk_user_id || "--"}</span>
                                          </td>
                                          <td className="px-6 py-2 text-center text-xs font-bold text-slate-600 tabular-nums">{new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                          <td className="px-6 py-2 text-center text-xs font-black text-indigo-600 tabular-nums">{row.logs.length > 0 ? formatRawTime(row.logs[0].check_time) : "--:--"}</td>
                                          <td className="px-6 py-2 last:rounded-r-2xl">
                                             <div className="flex justify-center">
                                                {row.status === 'present' ? (
                                                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase border border-emerald-100 shadow-sm"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" /> P</div>
                                                ) : row.status === 'late' ? (
                                                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase border border-amber-100 shadow-sm"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]" /> L</div>
                                                ) : (
                                                  <div className="flex items-center gap-1.5 bg-rose-50 text-rose-500 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase border border-rose-100"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full opacity-50" /> A</div>
                                                )}
                                             </div>
                                          </td>
                                        </>
                                      )}"""

# Use negative lookahead or careful match for the inner div body not to eat other rows!
# The .*? might match too much. But we only do count=1 so it's the first occurrence.
# Let's refine the pattern to be safe: match exactly over a small window without TRs
safe_tbody_pattern = re.compile(
    r'(<td className="px-6 py-2 text-center text-\[10px\] font-black text-slate-400 tabular-nums">[^<]*<span[^>]*>[^<]*</span>[^<]*</td>[^<]*<td[^>]*>[^<]*</td>[^<]*<td[^>]*>[^<]*</td>[^<]*<td className="px-6 py-2 last:rounded-r-2xl">.*?</td\s*>)',
    re.DOTALL
)

content, count2 = safe_tbody_pattern.subn(replacement_tbody, content, count=1)
print(f"Replaced tbody: {count2}")

if count1 == 1 and count2 == 1:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("SAVED FILE SUCCESFULLY")
