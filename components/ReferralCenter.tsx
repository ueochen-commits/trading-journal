import React, { useState } from 'react';
import { useUser } from './UserContext';
import { useLanguage } from '../LanguageContext';

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  border: '#e8e8f0',
  borderSec: '#d1d5db',
  bgPrimary: '#ffffff',
  bgSecondary: '#f7f7f9',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  primary: '#1a1a18',
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Ico = {
  Copy: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Check: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  ChevronDown: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Plus: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Download: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Video: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  BarChart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Image: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Music: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Award: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Share: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  CheckCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Gift: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  Empty: () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.borderSec} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Logo: () => <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#1a1a18"/><path d="M8 16 L16 8 L24 16 L16 24 Z" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="16" cy="16" r="3" fill="#fff"/></svg>,
  ArrowLeft: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
};

const ICON_MAP: Record<string, React.FC> = { Video: Ico.Video, BarChart: Ico.BarChart, Image: Ico.Image, Music: Ico.Music, Users: Ico.Users, Award: Ico.Award, FileText: Ico.FileText };

// ── Task data ─────────────────────────────────────────────────────────────────
const TASKS = [
  { id: 1, icon: 'Video', tag: '高分', tagDark: true, name: '发布 B站 / YouTube 评测视频', deadline: '2026年1月1日', points: 2000,
    requirements: ['提交 B站或 YouTube 视频链接', '视频须在任务开始后发布', '在视频简介中附上推广链接'],
    rewards: ['播放量达 500，获得 +200 积分', '每增加 1000 播放量额外 +100 积分（上限 2000 积分，约 2 万播放）'],
    detail: '在 B站或 YouTube 发布一段真实体验 TradeGrail 的评测视频，介绍平台核心功能——交易日志、AI 复盘、风控系统等。',
    rules: ['请真实分享使用感受', '最少 8 分钟时长', '必须为正向评测'] },
  { id: 2, icon: 'BarChart', tag: '高分', tagDark: true, name: '发布策略回测视频（B站 / 抖音）', deadline: '2026年1月1日', points: 3000,
    requirements: ['提交视频链接', '视频须在任务开始后发布', '包含推广链接'],
    rewards: ['播放量达 250，获得 +300 积分', '每增加 1000 播放量额外 +150 积分（上限 3000 积分）'],
    detail: '在 B站或抖音发布一段使用 TradeGrail 进行策略回测的教学视频，展示如何用数据优化交易策略。',
    rules: ['任意品种和策略', '最少 10 分钟', '在视频简介中附上推广链接'] },
  { id: 3, icon: 'Image', tag: '新任务', tagDark: false, name: '在小红书发布图文种草帖', deadline: '2026年5月31日', points: 800,
    requirements: ['提交小红书帖子链接', '须在任务开始后发布', '@TradeGrail 官方账号'],
    rewards: ['帖子获赞达 50，获得 +200 积分', '每增加 100 赞额外 +100 积分（上限 800 积分）'],
    detail: '在小红书发布一篇真实的 TradeGrail 使用体验图文，可以是功能介绍、交易复盘展示或使用心得分享。',
    rules: ['图文不少于 200 字', '配图不少于 3 张', '必须 @TradeGrail 官方账号'] },
  { id: 4, icon: 'Music', tag: '新任务', tagDark: false, name: '在抖音发布使用心得短视频', deadline: '2026年5月31日', points: 1200,
    requirements: ['提交抖音视频链接', '视频须在任务开始后发布', '在视频中口播提及 TradeGrail'],
    rewards: ['播放量达 1000，获得 +300 积分', '每增加 5000 播放额外 +150 积分（上限 1200 积分）'],
    detail: '在抖音发布一段关于 TradeGrail 的短视频，展示真实使用场景，例如如何用 TradeGrail 复盘一笔交易。',
    rules: ['视频时长 30 秒以上', '需在视频中口播提及 TradeGrail', '自然真实的呈现方式'] },
  { id: 5, icon: 'Users', tag: '', tagDark: false, name: '举办交易复盘在线研讨会', deadline: '无截止日期', points: 2500,
    requirements: ['提交研讨会录像或直播回放链接', '参与人数不少于 20 人', '研讨会中需介绍 TradeGrail 的使用方法'],
    rewards: ['参与人数 20-50 人获得 +800 积分', '50-100 人获得 +1500 积分', '超过 100 人获得 +2500 积分'],
    detail: '主持一场以交易复盘为主题的线上研讨会（微信群直播、腾讯会议、B站直播等均可），在会中演示 TradeGrail 的使用方法。',
    rules: ['须提前至少 3 天公告研讨会信息', '研讨会时长不少于 30 分钟', '提交参与截图或录像作为证明'] },
  { id: 6, icon: 'Award', tag: '', tagDark: false, name: '举办社群交易挑战赛', deadline: '无截止日期', points: 5000,
    requirements: ['提交挑战赛报告或结果截图', '参与人数不少于 10 人', '参赛者须使用 TradeGrail 记录交易'],
    rewards: ['10-30 人参与获得 +1500 积分', '30-100 人获得 +3000 积分', '超过 100 人获得 +5000 积分'],
    detail: '在你的交易社群发起一场以 TradeGrail 为工具的交易挑战赛，参赛者使用 TradeGrail 记录每笔交易。',
    rules: ['挑战赛时长不少于 7 天', '须以截图或报告形式记录参与情况', '不得使用模拟账户数据'] },
  { id: 7, icon: 'FileText', tag: '', tagDark: false, name: '在知乎 / 雪球发布使用报告', deadline: '无截止日期', points: 600,
    requirements: ['提交文章链接', '文章发布于任务开始后', '正文不少于 500 字'],
    rewards: ['文章获赞达 20，获得 +200 积分', '每增加 50 赞额外 +100 积分（上限 600 积分）'],
    detail: '在知乎、雪球或其他中文专业社区发布一篇关于 TradeGrail 的深度使用报告。',
    rules: ['正文不少于 500 字', '须包含实际截图作为佐证', '评测内容需真实客观'] },
];

const FAQS = [
  { q: '什么是 TradeGrail 推广计划？', a: 'TradeGrail 推广计划是一个基于积分奖励的用户推广体系。邀请新用户注册获得 100 积分，被邀请人升级 Pro 额外获得 500 积分，积分可兑换 Pro 功能、AI 报告等专属权益。' },
  { q: '什么算作一次成功的推广？', a: '新用户通过你的专属链接注册并完成邮箱验证，即视为一次成功推广。若该用户在 30 天内升级 Pro，你将再获得 500 积分。' },
  { q: '积分如何兑换？', a: '在账户设置的积分兑换页面使用。500 积分兑换 30 天 Pro 功能；1000 积分解锁 AI 月度报告；5000 积分成为官方推广大使，享永久 Pro 会员。' },
  { q: '我可以自己推荐自己吗？', a: '不可以。系统会自动检测自我推荐行为，一旦发现相关积分将被作废。' },
  { q: '任务提交后多久审核？', a: '3-7 个工作日内完成审核，通过后积分自动发放至账户并发送站内通知。' },
];

const LEADERBOARD = [
  { rank: 1, name: '雄壮的栗色猎豹', points: 12400 },
  { rank: 2, name: '敏捷的深蓝海豚', points: 9800 },
  { rank: 3, name: '沉稳的暗金雄鹰', points: 7200 },
  { rank: 4, name: '灵动的翠绿蜂鸟', points: 5100 },
  { rank: 5, name: '威猛的银灰猎狼', points: 3600 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const Banner: React.FC<{ refLink: string }> = ({ refLink }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(refLink).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', borderBottom: `0.5px solid ${T.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 7, color: T.textPrimary }}>专属推广链接</div>
          <div style={{ display: 'flex', gap: 7 }}>
            <input readOnly value={refLink} style={{ flex: 1, border: `0.5px solid ${T.border}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, background: T.bgSecondary, color: T.textSecondary, outline: 'none' }} />
            <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.primary, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {copied ? <Ico.Check /> : <Ico.Copy />}{copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </div>
        <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>奖励规则</span>
            <span style={{ fontSize: 11, color: T.textTertiary, cursor: 'pointer' }}>查看条款 ↗</span>
          </div>
          {[{ text: '邀请新用户注册', pts: '+100 积分' }, { text: '被邀请人升级 Pro，额外获得', pts: '+500 积分' }].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12, color: T.textSecondary }}>
              <Ico.Gift />{r.text} <span style={{ fontWeight: 500, color: T.textPrimary }}>{r.pts}</span>
            </div>
          ))}
          <div style={{ borderTop: `0.5px solid ${T.border}`, marginTop: 8, paddingTop: 8, fontSize: 11, color: T.textTertiary }}>
            积分最低兑换：0 分 · 积分有效期：永久
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', background: '#fff', overflow: 'hidden', backgroundImage: 'radial-gradient(ellipse 220px 180px at 90% 25%, rgba(255,170,170,0.6) 0%, rgba(255,170,170,0) 100%), radial-gradient(ellipse 200px 160px at 115% 75%, rgba(255,215,120,0.55) 0%, rgba(255,215,120,0) 100%), radial-gradient(ellipse 240px 200px at 55% 90%, rgba(140,200,255,0.5) 0%, rgba(140,200,255,0) 100%), radial-gradient(ellipse 220px 180px at 25% 55%, rgba(170,240,200,0.5) 0%, rgba(170,240,200,0) 100%), radial-gradient(ellipse 200px 160px at 75% 15%, rgba(200,180,255,0.5) 0%, rgba(200,180,255,0) 100%), radial-gradient(ellipse 180px 140px at 45% 110%, rgba(255,195,160,0.45) 0%, rgba(255,195,160,0) 100%)' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 100, background: 'linear-gradient(to right, #fff 0%, rgba(255,255,255,0) 100%)' }} />
        <div style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', width: 68, height: 68, borderRadius: '50%', background: '#fff', border: `0.5px solid ${T.border}`, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ico.Logo />
        </div>
        <div style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 10, color: T.textTertiary }}>Powered by TradeGrail</div>
      </div>
    </div>
  );
};

const TABS = ['快速开始', '任务中心', '收益记录', '我的链接', '排行榜', '常见问题', '推广素材'];

const TabBar: React.FC<{ active: number; onChange: (i: number) => void }> = ({ active, onChange }) => (
  <div style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: `0.5px solid ${T.border}`, background: '#fff', padding: '0 28px', display: 'flex', gap: 0 }} className="dark:bg-slate-900 dark:border-slate-700">
    {TABS.map((tab, i) => (
      <button key={tab} onClick={() => onChange(i)} style={{ padding: '9px 12px', fontSize: 12, fontWeight: active === i ? 500 : 400, color: active === i ? T.textPrimary : T.textTertiary, background: 'none', border: 'none', borderBottom: active === i ? `1.5px solid ${T.primary}` : '1.5px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
        {tab}{i === 1 && <span style={{ background: T.primary, color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20, fontVariantNumeric: 'tabular-nums' }}>{TASKS.length}</span>}
      </button>
    ))}
  </div>
);

// ── Tab 1: Quick Start ────────────────────────────────────────────────────────
const TabQuickStart: React.FC<{ refLink: string; onTab: (i: number) => void }> = ({ refLink, onTab }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(refLink).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const cards = [
    { title: '分享推广链接', desc: '将你的专属推广链接分享到各大平台，每成功邀请一位新用户注册即可获得积分奖励。', btnLabel: copied ? '已复制' : '复制推广链接', btnPrimary: true, onClick: copy,
      icon: <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>{['微信', 'B站', '小红书', '抖音', '知乎', '其他'].map(p => <div key={p} style={{ border: `0.5px solid ${T.border}`, borderRadius: 5, padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.textTertiary }}>{p}</div>)}</div> },
    { title: '完成推广任务', desc: '通过完成平台指定的推广任务获取更多积分，包括发布视频、图文等内容创作任务。', btnLabel: '查看任务中心', btnPrimary: false, onClick: () => onTab(1),
      icon: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div> },
    { title: '兑换专属奖励', desc: '积累足够积分后，可在收益记录页面兑换 Pro 功能、AI 报告等专属权益。', btnLabel: '查看收益记录', btnPrimary: false, onClick: () => onTab(2),
      icon: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></div> },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {cards.map(c => (
        <div key={c.title} style={{ border: `0.5px solid ${T.border}`, borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 68, border: `0.5px solid ${T.border}`, borderRadius: 8, background: T.bgSecondary, marginBottom: 12, overflow: 'hidden', padding: 8 }}>{c.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, color: T.textPrimary }}>{c.title}</div>
          <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.6, flex: 1, marginBottom: 12 }}>{c.desc}</div>
          <button onClick={c.onClick} style={{ border: c.btnPrimary ? 'none' : `0.5px solid ${T.borderSec}`, borderRadius: 6, padding: 7, fontSize: 12, cursor: 'pointer', background: c.btnPrimary ? T.primary : 'transparent', color: c.btnPrimary ? '#fff' : T.textPrimary, fontWeight: c.btnPrimary ? 500 : 400 }}>{c.btnLabel}</button>
        </div>
      ))}
    </div>
  );
};

// ── Tab 2: Task Center ────────────────────────────────────────────────────────
const TaskDetail: React.FC<{ task: typeof TASKS[0]; onBack: () => void }> = ({ task, onBack }) => {
  const IcoComp = ICON_MAP[task.icon] || Ico.FileText;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textTertiary, marginBottom: 16 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.textTertiary, padding: 0 }}><Ico.ArrowLeft />任务中心</button>
        <span>/</span><span style={{ color: T.textPrimary }}>{task.name}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 256px', gap: 18 }}>
        <div>
          {[
            { title: '提交要求', items: task.requirements.map(r => ({ main: r, sub: '' })), type: 'check' },
            { title: '积分奖励标准', items: task.rewards.map(r => ({ main: r, sub: '' })), type: 'bar' },
            { title: '任务详情', items: [{ main: task.detail, sub: '' }, ...task.rules.map(r => ({ main: '· ' + r, sub: '' }))], type: 'text' },
          ].map(section => (
            <div key={section.title} style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: T.textPrimary }}>{section.title}</div>
              {section.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: '#444', lineHeight: 1.7, ...(section.type === 'bar' ? { borderLeft: `1.5px solid ${T.borderSec}`, paddingLeft: 10 } : {}) }}>
                  {section.type === 'check' && <span style={{ color: T.textPrimary, flexShrink: 0 }}>✓</span>}
                  <span>{item.main}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ height: 96, background: T.bgSecondary, borderBottom: `0.5px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoComp /></div>
          <div style={{ padding: '12px 13px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5, color: T.textPrimary }}>{task.name}</div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: 4 }}>截止：{task.deadline}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>最高 +{task.points.toLocaleString()} 积分</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabTasks: React.FC = () => {
  const [selected, setSelected] = useState<typeof TASKS[0] | null>(null);
  if (selected) return <TaskDetail task={selected} onBack={() => setSelected(null)} />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
      {TASKS.map(task => {
        const IcoComp = ICON_MAP[task.icon] || Ico.FileText;
        return (
          <div key={task.id} onClick={() => setSelected(task)} style={{ border: `0.5px solid ${T.border}`, borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = T.textSecondary}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = T.border}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, border: `0.5px solid ${T.border}`, borderRadius: 7, background: T.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IcoComp /></div>
              {task.tag && <span style={{ background: task.tagDark ? T.primary : 'rgba(0,0,0,0.06)', color: task.tagDark ? '#fff' : '#666', fontSize: 10, padding: '2px 7px', borderRadius: 3 }}>{task.tag}</span>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, marginBottom: 4, color: T.textPrimary }}>{task.name}</div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginBottom: 8 }}>截止：{task.deadline}</div>
            <div style={{ borderTop: `0.5px solid ${T.border}`, paddingTop: 6, fontSize: 12, fontWeight: 500, color: T.textPrimary }}>最高 +{task.points.toLocaleString()} 积分</div>
          </div>
        );
      })}
    </div>
  );
};

// ── Tab 3-7 ───────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10 }}>
    <Ico.Empty /><span style={{ fontSize: 13, color: T.textTertiary }}>{text}</span>
  </div>
);

const TabEarnings: React.FC = () => <EmptyState text="暂无积分记录，邀请好友后将显示在此处" />;

const TabLinks: React.FC<{ refLink: string }> = ({ refLink }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.primary, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}><Ico.Plus />新建链接</button>
    </div>
    <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ borderBottom: `0.5px solid ${T.border}`, background: T.bgSecondary }}>{['链接', '点击', '注册', '转化', '积分'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, color: T.textSecondary }}>{h}</th>)}</tr></thead>
        <tbody><tr><td style={{ padding: '10px 14px', color: T.textSecondary, fontSize: 11 }}>{refLink}</td>{['0', '0', '0%', '0'].map((v, i) => <td key={i} style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums', color: T.textTertiary }}>{v}</td>)}</tr></tbody>
      </table>
    </div>
  </div>
);

const TabLeaderboard: React.FC = () => (
  <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead><tr style={{ borderBottom: `0.5px solid ${T.border}`, background: T.bgSecondary }}>{['排名', '推广伙伴', '累计积分'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, color: T.textSecondary }}>{h}</th>)}</tr></thead>
      <tbody>
        {LEADERBOARD.map(row => (
          <tr key={row.rank} style={{ borderBottom: `0.5px solid ${T.border}` }}>
            <td style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums', color: row.rank <= 3 ? '#BA7517' : T.textTertiary, fontWeight: row.rank <= 3 ? 500 : 400 }}>{row.rank}</td>
            <td style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.textTertiary, flexShrink: 0 }}>{row.name[0]}</div>
                <span style={{ fontSize: 12, color: T.textPrimary }}>{row.name}</span>
              </div>
            </td>
            <td style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums', color: T.textPrimary }}>{row.points.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TabFAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, overflow: 'hidden' }}>
      {FAQS.map((faq, i) => (
        <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? `0.5px solid ${T.border}` : 'none' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.textPrimary, textAlign: 'left' }}>
            {faq.q}<span style={{ fontSize: 16, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 8 }}>+</span>
          </button>
          {open === i && <div style={{ padding: '0 16px 13px', fontSize: 12, color: T.textSecondary, lineHeight: 1.7 }}>{faq.a}</div>}
        </div>
      ))}
    </div>
  );
};

const TabAssets: React.FC = () => {
  const sectionLabel = (text: string) => <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.textTertiary, marginBottom: 8, marginTop: 16 }}>{text}</div>;
  const files = [
    { name: 'TradeGrail Logo（深色版）', size: '44KB', type: 'download' },
    { name: 'TradeGrail Logo（浅色版）', size: '43KB', type: 'download' },
    { name: '产品演示 GIF 动图包', size: '8.2MB', type: 'download' },
  ];
  const links = [
    { name: '品牌视觉素材包（含 Logo、截图、Banner）', size: 'Google Drive', type: 'copy' },
    { name: '产品截图合集（高清截图，可直接用于内容创作）', size: 'Google Drive', type: 'copy' },
  ];
  const Row: React.FC<{ name: string; size: string; btnLabel: string }> = ({ name, size, btnLabel }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `0.5px solid ${T.border}` }}>
      <div style={{ width: 27, height: 27, border: `0.5px solid ${T.border}`, borderRadius: 5, background: T.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}><Ico.FileText /></div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>{name}</div><div style={{ fontSize: 11, color: T.textTertiary }}>{size}</div></div>
      <button style={{ border: `0.5px solid ${T.border}`, borderRadius: 5, padding: '4px 9px', fontSize: 11, background: 'none', cursor: 'pointer', color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 4 }}><Ico.Download />{btnLabel}</button>
    </div>
  );
  return (
    <div>
      {sectionLabel('品牌素材')}
      <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, overflow: 'hidden' }}>
        {files.map(f => <Row key={f.name} name={f.name} size={f.size} btnLabel="下载" />)}
      </div>
      {sectionLabel('素材链接')}
      <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 9, overflow: 'hidden' }}>
        {links.map(l => <Row key={l.name} name={l.name} size={l.size} btnLabel="复制" />)}
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
const ReferralCenter: React.FC = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState(0);
  const refLink = `tradegrail.co/invite/${user?.username || user?.id || 'user'}`;

  const renderTab = () => {
    switch (activeTab) {
      case 0: return <TabQuickStart refLink={refLink} onTab={setActiveTab} />;
      case 1: return <TabTasks />;
      case 2: return <TabEarnings />;
      case 3: return <TabLinks refLink={refLink} />;
      case 4: return <TabLeaderboard />;
      case 5: return <TabFAQ />;
      case 6: return <TabAssets />;
      default: return null;
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: T.bgPrimary }} className="dark:bg-slate-900">
      <div style={{ borderBottom: `0.5px solid ${T.border}`, padding: '20px 28px 14px', fontSize: 16, fontWeight: 500, color: T.textPrimary }} className="dark:text-white dark:border-slate-700">
        推广中心
      </div>
      <Banner refLink={refLink} />
      <TabBar active={activeTab} onChange={setActiveTab} />
      <div style={{ padding: '20px 28px' }}>
        {renderTab()}
      </div>
    </div>
  );
};

export default ReferralCenter;


