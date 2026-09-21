export interface Formation {
  code: string
  label: string
  description: string
}

export const ATTACK_DIRECTION: 'right' | 'left' = 'right'

export const UNDEFINED_FORMATION = ''

export function isUnspecifiedFormation(code: string): boolean {
  return code === UNDEFINED_FORMATION
}

export interface FormationGroup {
  title: string
  defenders: number
  formations: Formation[]
}

export const formationGroups: FormationGroup[] = [
  {
    title: 'أربعة مدافعين',
    defenders: 4,
    formations: [
      { code: '4-4-2', label: 'كلاسيكي متوازن', description: 'تشكيلة كلاسيكية متوازنة بين الدفاع والهجوم' },
      { code: '4-3-3', label: 'هجومي منتشر', description: 'تشكيلة هجومية شائعة جداً' },
      { code: '4-2-3-1', label: 'حديث شامل', description: 'من أكثر التشكيلات الحديثة استخداماً' },
      { code: '4-4-1-1', label: 'هجين مهاجم ثانٍ', description: 'تنويع على 4-4-2 مع مهاجم ثانٍ متأخر' },
      { code: '4-3-1-2', label: 'صانع ألعاب متقدم', description: 'تشكيلة ضيقة مع صانع ألعاب خلف مهاجمين' },
      { code: '4-2-2-2', label: 'ثنائي ارتكاز وأجنحة', description: 'محورا دفاع + جناحا ألعاب' },
      { code: '4-1-4-1', label: 'محور وحيد', description: 'محور ارتكاز واحد + أربعة لاعبي وسط' },
      { code: '4-5-1', label: 'وسط مكتظ', description: 'وسط ميدان مكتظ مع مهاجم واحد' },
      { code: '4-3-2-1', label: 'شجرة عيد الميلاد', description: 'تشكيلة ضيقة على شكل شجرة الميلاد' },
    ],
  },
  {
    title: 'ثلاثة مدافعين',
    defenders: 3,
    formations: [
      { code: '3-5-2', label: 'أجنحة داعمة', description: 'ثلاثة مدافعين + أجنحة + مهاجمان' },
      { code: '3-4-3', label: 'ثلاثي هجومي', description: 'ثلاثة مدافعين + أربعة وسط + ثلاثة مهاجمين' },
      { code: '3-4-2-1', label: 'صانعا لعب', description: 'ثلاثة قلب دفاع + صانعا لعب + مهاجم' },
      { code: '3-4-1-2', label: 'مهاجم متأخر', description: 'صانع ألعاب خلف مهاجمين' },
      { code: '3-3-3-1', label: 'خط هجومي', description: 'ثلاثة مدافعين + ثلاثة وسط + خط هجومي' },
    ],
  },
  {
    title: 'خمسة مدافعين',
    defenders: 5,
    formations: [
      { code: '5-3-2', label: 'دفاع محكم', description: 'نسخة دفاعية من 3-5-2' },
      { code: '5-4-1', label: 'دفاع صارم', description: 'تشكيلة دفاعية جداً' },
      { code: '5-2-3', label: 'قاعدة دفاعية', description: 'قاعدة دفاعية مع ثلاثة مهاجمين' },
      { code: '5-3-1-1', label: 'دفاع متراص', description: 'إعداد دفاعي مدمج مع مهاجم ثانٍ' },
    ],
  },
  {
    title: 'تشكيلات أخرى',
    defenders: 0,
    formations: [
      { code: '4-2-1-3', label: 'ثنائي ارتكاز', description: 'أربعة دفاع + ثنائي محوري + صانع لعب + ثلاثة هجوم' },
      { code: '3-2-4-1', label: 'هجومي التمركز', description: 'بنية عصرية تعتمد على الاستحواذ' },
    ],
  },
]

export const formations: Formation[] = formationGroups.flatMap((g) => g.formations)

export function parseFormation(code: string): number[] {
  if (isUnspecifiedFormation(code)) return []
  return code.split('-').map(Number)
}

export function outfieldCount(code: string): number {
  if (isUnspecifiedFormation(code)) return 0
  return parseFormation(code).reduce((sum, n) => sum + n, 0)
}

export function slotRoles(code: string): string[] {
  if (isUnspecifiedFormation(code)) return []
  const rows = [1, ...parseFormation(code)]
  const roles: string[] = []
  rows.forEach((n, ri) => {
    const role = ri === 0 ? 'حارس' : ri === 1 ? 'دفاع' : ri === rows.length - 1 ? 'هجوم' : 'وسط'
    for (let i = 0; i < n; i++) roles.push(role)
  })
  return roles
}

export function formationLabel(code: string): string {
  if (isUnspecifiedFormation(code)) return 'غير محدد'
  return formations.find((f) => f.code === code)?.label ?? code
}

export function formationDescription(code: string): string {
  if (isUnspecifiedFormation(code)) return 'لم يتم اختيار تشكيلة بعد'
  return formations.find((f) => f.code === code)?.description ?? ''
}
