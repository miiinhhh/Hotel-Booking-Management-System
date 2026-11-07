export const maskEmail = (value: string) => {
  const [local = '', domain = ''] = value.split('@');
  const domainParts = domain.split('.');
  const domainName = domainParts.shift() || '';
  const extension = domainParts.length ? `.${domainParts.join('.')}` : '';
  const visibleLocal = local.slice(0, Math.min(2, local.length));
  const visibleDomain = domainName.slice(0, 1);
  return `${visibleLocal}•••@${visibleDomain}•••${extension}`;
};

export const maskPhone = (value: string | null | undefined) => {
  if (!value) return 'Chưa cập nhật';
  const digits = value.replace(/\D/g, '');
  return `•••• ••• ${digits.slice(-3)}`;
};

export const maskBirthDate = (value: string | null | undefined) =>
  value ? `••/••/${value.slice(0, 4)}` : 'Chưa cập nhật';
