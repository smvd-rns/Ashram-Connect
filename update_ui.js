const fs = require('fs');
const path = 'c:/Users/Admin/Documents/BC-Class/yt-lectures-final/src/components/AttendanceTracing.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Header
content = content.replace(
  '<th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">User Details</th>',
  '<th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">User Details</th>\n                             <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">ID</th>'
);

// 2. Add Body Cell
content = content.replace(
  '<td className="px-6 py-3 text-sm font-bold text-slate-600 tabular-nums">',
  '<td className="px-6 py-3 text-xs font-black text-slate-400 tabular-nums">\n                                      {row.logs[0]?.zk_user_id || "--"}\n                                   </td>\n                                   <td className="px-6 py-3 text-sm font-bold text-slate-600 tabular-nums">'
);

fs.writeFileSync(path, content);
console.log('Successfully updated AttendanceTracing.tsx');
