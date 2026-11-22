// Backend chỉ lưu số sao + bình luận (tối đa 2000 ký tự). Điểm theo tiêu chí và tag được
// ghép vào cuối bình luận theo định dạng cố định để có thể tách lại khi khách sửa đánh giá.

export type CriteriaKey = 'cleanliness' | 'location' | 'service' | 'facilities' | 'value';
export type CriteriaRatings = Record<CriteriaKey, number>;

export const CRITERIA_LABELS: Record<CriteriaKey, string> = {
  cleanliness: 'Sạch sẽ',
  location: 'Vị trí',
  service: 'Dịch vụ',
  facilities: 'Tiện nghi',
  value: 'Đáng giá tiền',
};

/** Tag chọn nhanh: giá trị lưu (tiếng Việt) → khóa dịch để hiển thị. */
export const REVIEW_TAGS = [
  { value: 'Không gian yên tĩnh', key: 'review.tag.quiet' },
  { value: 'Nhân viên nhiệt tình', key: 'review.tag.staff' },
  { value: 'Phòng sạch sẽ', key: 'review.tag.clean' },
  { value: 'Vị trí thuận tiện', key: 'review.tag.location' },
  { value: 'Bữa sáng phong phú', key: 'review.tag.breakfast' },
] as const;
export const tagLabelKey = (value: string) => REVIEW_TAGS.find(t => t.value === value)?.key;

export const DEFAULT_CRITERIA: CriteriaRatings = { cleanliness: 5, location: 5, service: 5, facilities: 5, value: 5 };

const CRITERIA_PREFIX = 'Đánh giá chi tiết: ';
const TAGS_PREFIX = 'Điểm nổi bật: ';

export function composeReviewComment(comment: string, criteria: CriteriaRatings, tags: string[]) {
  const lines = [
    CRITERIA_PREFIX + (Object.keys(CRITERIA_LABELS) as CriteriaKey[]).map(key => `${CRITERIA_LABELS[key]} ${criteria[key]}/5`).join(' · '),
  ];
  if (tags.length) lines.push(TAGS_PREFIX + tags.join(', '));
  const body = comment.trim();
  return (body ? `${body}\n\n` : '') + lines.join('\n');
}

export function parseReviewComment(raw: string | null | undefined): { comment: string; criteria: CriteriaRatings; tags: string[] } {
  const criteria = { ...DEFAULT_CRITERIA };
  let tags: string[] = [];
  const kept: string[] = [];
  for (const line of (raw || '').split('\n')) {
    if (line.startsWith(CRITERIA_PREFIX)) {
      for (const part of line.slice(CRITERIA_PREFIX.length).split(' · ')) {
        const key = (Object.keys(CRITERIA_LABELS) as CriteriaKey[]).find(k => part.startsWith(CRITERIA_LABELS[k] + ' '));
        const score = Number(part.match(/(\d)\/5$/)?.[1]);
        if (key && score >= 1 && score <= 5) criteria[key] = score;
      }
    } else if (line.startsWith(TAGS_PREFIX)) {
      tags = line.slice(TAGS_PREFIX.length).split(',').map(t => t.trim()).filter(Boolean);
    } else {
      kept.push(line);
    }
  }
  return { comment: kept.join('\n').trim(), criteria, tags };
}
