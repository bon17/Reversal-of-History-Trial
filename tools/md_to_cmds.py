# 대본(md)의 대사와 연출 줄을 게임 데이터 모양의 초안으로 바꿔 보여 준다 (화 데이터를 새로 쓸 때 글자를 그대로 옮기려고 쓴다).
# 실행: python3 tools/md_to_cmds.py docs/대본/제6화_명령서는_없다.md > 초안.txt
# 결과는 초안일 뿐이다. 증언, 반격, 조사 같은 구조는 사람이(또는 Claude가) 짠다.
import re, sys
src = sys.argv[1]
lines = open(src, encoding='utf-8').read().split('\n')
def q(t):
    if "'" not in t: return "'" + t + "'"
    if '"' not in t: return '"' + t + '"'
    return '`' + t + '`'
out = []
i = 0
pending_speaker = None
while i < len(lines):
    L = lines[i]; n = i + 1
    if L.startswith('#'):
        out.append(f'// L{n} {L}'); pending_speaker=None
    elif m := re.match(r'^\*\*([^*\[\]]+?)\*\* \(([^)]+)\):\s*(.*)$', L):
        who, ex, t = m.groups()
        if t.strip():
            out.append(f"{{ 말: {q(who)}, 표정: {q(ex)}, 대사: {q(t.strip())} }}, // L{n}")
            pending_speaker=None
        else:
            pending_speaker=(who,ex)
            out.append(f"// L{n} speaker {who} ({ex}) list:")
    elif m := re.match(r'^\*\*\(([^)]*)\)\*\*:\s*(.*)$', L):
        out.append(f"{{ 말: {q('('+m.group(1)+')')}, 대사: {q(m.group(2).strip())} }}, // L{n}")
    elif m := re.match(r'^(\d+(?:-\d+)?)\.\s+(.*)$', L):
        w = pending_speaker
        out.append(f"  [{m.group(1)}] {q(m.group(2))}  // L{n}" + (f" ({w[0]})" if w else ''))
    elif L.startswith('>'):
        t = L[1:].strip()
        if pending_speaker and t:
            out.append(f"{{ 말: {q(pending_speaker[0])}, 표정: {q(pending_speaker[1])}, 대사: {q(t)} }}, // L{n} >")
        elif t: out.append(f"  > {q(t)}  // L{n}")
    elif L.startswith('|'):
        cells = [c.strip() for c in L.split('|')[1:-1]]
        if cells and re.match(r'^\d+$', cells[0]):
            out.append(f"  ROW {cells[0]}: 글 {q(cells[1])}  // L{n}")
            pm = re.match(r'^\*\*(.+?):\*\*\s*(.+?)\s*/\s*\*\*(.+?):\*\*\s*(.+)$', cells[2])
            if pm: out.append(f"     추궁: {pm.group(1)}: {q(pm.group(2))} / {pm.group(3)}: {q(pm.group(4))}")
            else: out.append(f"     추궁: {cells[2]}")
            out.append(f"     정답: {cells[3]}")
        elif cells: out.append(f"  TABLE {cells}  // L{n}")
    elif L.startswith('**['):
        out.append(f"  {L}  // L{n}")
        pending_speaker=None
    elif L.startswith('- '):
        out.append(f"  - {L[2:]}  // L{n}")
    elif L.strip() and L.strip() != '---':
        out.append(f"  ?? {L}  // L{n}")
        pending_speaker=None
    i += 1
print('\n'.join(out))
