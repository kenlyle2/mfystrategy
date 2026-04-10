import json
from datetime import datetime
from collections import defaultdict

with open('/sessions/funny-exciting-mendel/mnt/postglider/competitor_data/dean_pohlman_ig/raw_data.json') as f:
    data = json.load(f)

summary = data['summary']
posts = data['all_posts']
post_dist = data['post_distribution']
themes = data['content_themes']
hashtags = data['hashtags']['details']
account_avg_eng = summary['avg_engagement_pct']

# ── 1. FORMAT ANALYSIS ─────────────────────────────────────────────────────────
total_posts = sum(v['posts'] for v in post_dist.values())
total_eng   = sum(v['engagement'] for v in post_dist.values())

fmt = {}
for name, d in post_dist.items():
    fmt[name] = {
        'posts': d['posts'],
        'post_share': round(d['posts']/total_posts*100, 1),
        'engagement': d['engagement'],
        'eng_share': round(d['engagement']/total_eng*100, 1),
        'eng_per_post': round(d['engagement']/d['posts'], 1)
    }
    fmt[name]['efficiency_ratio'] = round(fmt[name]['eng_share'] / fmt[name]['post_share'], 2)

print("=== FORMAT EFFICIENCY ===")
for name, f in sorted(fmt.items(), key=lambda x: -x[1]['eng_per_post']):
    print(f"  {name:15s}: {f['post_share']:5.1f}% of posts | {f['eng_share']:5.1f}% of eng | {f['eng_per_post']:6.1f} eng/post | ratio {f['efficiency_ratio']:.2f}x")

# ── 2. DAY-OF-WEEK ANALYSIS ───────────────────────────────────────────────────
days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
dow_posts    = defaultdict(list)

for p in posts:
    dt = datetime.strptime(p['date'], '%Y-%m-%d')
    d  = days[dt.weekday()]
    dow_posts[d].append(p)

print("\n=== DAY-OF-WEEK POSTING & ENGAGEMENT ===")
print(f"  {'Day':4s}  {'Posts':>5s}  {'Avg Eng%':>9s}  {'Avg Likes':>9s}  {'vs Acct Avg':>11s}")
dow_summary = {}
for d in days:
    ps = dow_posts[d]
    if not ps:
        continue
    avg_eng  = round(sum(p['eng_pct'] for p in ps)/len(ps), 3)
    avg_lk   = round(sum(p['likes'] for p in ps)/len(ps), 1)
    vs_pct   = round((avg_eng - account_avg_eng)/account_avg_eng*100, 1)
    dow_summary[d] = {'count': len(ps), 'avg_eng': avg_eng, 'avg_likes': avg_lk, 'vs_pct': vs_pct}
    flag = ' ◄ AVOID' if vs_pct < -30 else (' ★ SWEET SPOT' if vs_pct > 50 else '')
    print(f"  {d:4s}  {len(ps):5d}  {avg_eng:9.3f}%  {avg_lk:9.1f}  {vs_pct:+10.1f}%{flag}")

# ── 3. THEME ROI ──────────────────────────────────────────────────────────────
print("\n=== THEME ROI (sorted by eng%) ===")
print(f"  {'Theme':45s}  {'Eng%':>6s}  {'Posts':>5s}  {'SOV%':>5s}  {'Delta':>7s}  {'Signal':>12s}")
for t in sorted(themes, key=lambda x: -x['eng_pct']):
    label = ' / '.join(t['labels'][:2])[:44]
    if t['eng_pct'] >= account_avg_eng * 1.5 and t['total_posts'] <= 6:
        signal = 'UNDER-USED'
    elif t['eng_pct'] >= account_avg_eng and t['total_posts'] >= 10:
        signal = 'INVEST MORE'
    elif t['eng_pct'] < account_avg_eng * 0.7 and t['total_posts'] >= 10:
        signal = 'CUT BACK'
    else:
        signal = ''
    print(f"  {label:45s}  {t['eng_pct']:>5.2f}%  {t['total_posts']:>5d}  {t['share_of_voice_pct']:>5.1f}%  {t['eng_delta']:>+7.2f}  {signal:>12s}")

# ── 4. HASHTAG EFFICIENCY ─────────────────────────────────────────────────────
print("\n=== HASHTAG EFFICIENCY ===")
high = [(h['tag'], h['eng_pct'], h['post_count']) for h in hashtags if h['eng_pct'] >= account_avg_eng and h['post_count'] >= 2]
low  = [(h['tag'], h['eng_pct'], h['post_count']) for h in hashtags if h['eng_pct'] < account_avg_eng * 0.8 and h['post_count'] >= 5]
print("  OUTPERFORMERS (use more):")
for tag, eng, ct in sorted(high, key=lambda x: -x[1]):
    print(f"    {tag:28s}  {eng:.2f}%  ({ct} posts)")
print("  UNDERPERFORMERS (drop/reduce):")
for tag, eng, ct in sorted(low, key=lambda x: x[1]):
    print(f"    {tag:28s}  {eng:.2f}%  ({ct} posts)")

# ── 5. TOP & BOTTOM POSTS ─────────────────────────────────────────────────────
print("\n=== TOP 10 POSTS BY ENGAGEMENT% ===")
top10 = sorted(posts, key=lambda x: -x['eng_pct'])[:10]
for p in top10:
    dt  = datetime.strptime(p['date'], '%Y-%m-%d')
    day = days[dt.weekday()]
    print(f"  {p['eng_pct']:5.2f}%  {day}  {p['likes']:3d}L {p['comments']:2d}C  {p['caption_snippet'][:62]}")

print("\n=== BOTTOM 10 POSTS BY ENGAGEMENT% ===")
bot10 = sorted(posts, key=lambda x: x['eng_pct'])[:10]
for p in bot10:
    dt  = datetime.strptime(p['date'], '%Y-%m-%d')
    day = days[dt.weekday()]
    print(f"  {p['eng_pct']:5.2f}%  {day}  {p['likes']:3d}L {p['comments']:2d}C  {p['caption_snippet'][:62]}")

# ── 6. WEEKEND vs WEEKDAY ─────────────────────────────────────────────────────
weekend_posts = [p for p in posts if datetime.strptime(p['date'],'%Y-%m-%d').weekday() >= 5]
weekday_posts = [p for p in posts if datetime.strptime(p['date'],'%Y-%m-%d').weekday() < 5]
we_avg = sum(p['eng_pct'] for p in weekend_posts)/len(weekend_posts) if weekend_posts else 0
wd_avg = sum(p['eng_pct'] for p in weekday_posts)/len(weekday_posts) if weekday_posts else 0
we_share_posts = len(weekend_posts)/len(posts)*100
we_share_eng   = sum(p['eng_pct'] for p in weekend_posts) / sum(p['eng_pct'] for p in posts) * 100
print(f"\n=== WEEKEND vs WEEKDAY ===")
print(f"  Weekend ({len(weekend_posts)} posts, {we_share_posts:.1f}% of posts): avg eng {we_avg:.3f}%")
print(f"  Weekday ({len(weekday_posts)} posts, {100-we_share_posts:.1f}% of posts): avg eng {wd_avg:.3f}%")
print(f"  Weekend eng share of total: {we_share_eng:.1f}%")
character = 'WEEKEND-CENTRIC' if we_avg > wd_avg * 1.15 else ('WEEKDAY-CENTRIC' if wd_avg > we_avg * 1.15 else 'BALANCED')
print(f"  Audience character: {character}")
