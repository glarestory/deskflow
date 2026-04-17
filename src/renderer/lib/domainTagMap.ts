// @MX:NOTE: [AUTO] domainTagMap — URL 도메인에서 자동 태그를 추출하는 내장 사전
// @MX:ANCHOR: [AUTO] DOMAIN_TAG_MAP — 여러 모듈(extractTags, bookmarkStore)에서 참조하는 태그 사전
// @MX:REASON: [AUTO] extractTags, bookmarkStore, migration 등 다수 모듈이 의존하는 공유 상수
// @MX:SPEC: SPEC-BOOKMARK-003

/**
 * 도메인 → 태그 매핑 사전
 * 키: 도메인 문자열 (소문자, 앞/뒤 공백 없음)
 * 값: 부여할 태그 배열
 */
export const DOMAIN_TAG_MAP: Record<string, string[]> = {
  // 코드 호스팅
  'github.com': ['dev', 'code'],
  'gitlab.com': ['dev', 'code'],
  'bitbucket.org': ['dev', 'code'],
  'gitea.io': ['dev', 'code'],
  'codeberg.org': ['dev', 'code'],

  // 동영상
  'youtube.com': ['video'],
  'youtu.be': ['video'],
  'vimeo.com': ['video'],
  'twitch.tv': ['video'],
  'dailymotion.com': ['video'],

  // AI
  'openai.com': ['ai'],
  'chat.openai.com': ['ai'],
  'anthropic.com': ['ai'],
  'claude.ai': ['ai'],
  'gemini.google.com': ['ai'],
  'bard.google.com': ['ai'],
  'copilot.microsoft.com': ['ai'],
  'huggingface.co': ['ai', 'dev'],

  // 이메일
  'mail.google.com': ['email'],
  'gmail.com': ['email'],
  'outlook.live.com': ['email'],
  'outlook.office.com': ['email'],

  // 노트/문서 도구
  'notion.so': ['notes'],
  'obsidian.md': ['notes'],
  'evernote.com': ['notes'],
  'onenote.com': ['notes'],
  'roamresearch.com': ['notes'],
  'logseq.com': ['notes'],

  // 디자인
  'figma.com': ['design'],
  'dribbble.com': ['design'],
  'behance.net': ['design'],
  'sketch.com': ['design'],
  'canva.com': ['design'],
  'adobe.com': ['design'],

  // 구글 문서/드라이브
  'docs.google.com': ['docs'],
  'drive.google.com': ['docs'],
  'sheets.google.com': ['docs'],
  'slides.google.com': ['docs'],

  // 개발 학습
  'stackoverflow.com': ['dev', 'learn'],
  'dev.to': ['dev', 'learn'],
  'developer.mozilla.org': ['dev', 'docs'],
  'npmjs.com': ['dev'],
  'pypi.org': ['dev'],
  'crates.io': ['dev'],
  'packagist.org': ['dev'],

  // 블로그/읽기
  'medium.com': ['blog', 'read'],
  'substack.com': ['blog', 'read'],
  'hashnode.com': ['blog', 'read'],
  'ghost.org': ['blog', 'read'],

  // 소셜/커뮤니티
  'twitter.com': ['social'],
  'x.com': ['social'],
  'linkedin.com': ['social'],
  'reddit.com': ['social'],
  'news.ycombinator.com': ['social', 'dev'],
  'discord.com': ['chat'],
  'discord.gg': ['chat'],
  'slack.com': ['chat'],
  'telegram.org': ['chat'],

  // 프로젝트 관리 / 이슈 트래킹
  'jira.com': ['dev'],
  'atlassian.net': ['dev'],
  'trello.com': ['dev'],
  'linear.app': ['dev'],
  'asana.com': ['dev'],

  // 클라우드
  'aws.amazon.com': ['dev', 'cloud'],
  'console.cloud.google.com': ['dev', 'cloud'],
  'portal.azure.com': ['dev', 'cloud'],
  'vercel.com': ['dev', 'cloud'],
  'netlify.com': ['dev', 'cloud'],
  'heroku.com': ['dev', 'cloud'],

  // 음악
  'open.spotify.com': ['music'],
  'music.apple.com': ['music'],
  'soundcloud.com': ['music'],
  'bandcamp.com': ['music'],

  // 쇼핑
  'amazon.com': ['shop'],
  'amazon.co.kr': ['shop'],
  'coupang.com': ['shop'],

  // 뉴스
  'bbc.com': ['news'],
  'nytimes.com': ['news'],
  'techcrunch.com': ['news', 'dev'],
  'theverge.com': ['news'],
  'hackernews.com': ['news', 'dev'],
}
