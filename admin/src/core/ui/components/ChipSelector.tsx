import { Stack, Typography, Chip } from '@mui/material'

interface SelectorOption<T extends string> {
  value: T
  label: string
}

interface ChipSelectorProps<T extends string> {
  label: string
  options: SelectorOption<T>[]
  value: T | null
  onChange: (value: T | null) => void
  allowEmpty?: boolean
  emptyLabel?: string
  disabled?: boolean
  accent?: (value: T | null) => string
}

export default function ChipSelector<T extends string>({ label, options, value, onChange, allowEmpty, emptyLabel = 'الكل', disabled, accent }: ChipSelectorProps<T>) {
  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary' }}>{label}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {allowEmpty && (
          <Chip
            label={emptyLabel}
            clickable={!disabled}
            disabled={disabled}
            onClick={() => onChange(null)}
            sx={{
              fontWeight: 800,
              bgcolor: value === null ? 'rgba(0,87,168,0.35)' : 'rgba(255,255,255,0.06)',
              color: value === null ? '#fff' : 'text.secondary',
              border: value === null ? '1px solid rgba(0,87,168,0.7)' : '1px solid rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: value === null ? 'rgba(0,87,168,0.45)' : 'rgba(255,255,255,0.1)' },
            }}
          />
        )}
        {options.map((opt) => {
          const active = value === opt.value
          const color = accent?.(opt.value)
          return (
            <Chip
              key={opt.value}
              label={opt.label}
              clickable={!disabled}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              sx={{
                fontWeight: 800,
                bgcolor: active ? `${color ?? '#142E3D'}55` : 'rgba(255,255,255,0.06)',
                color: active ? '#fff' : 'text.secondary',
                border: active ? `1px solid ${color ?? '#142E3D'}` : '1px solid rgba(255,255,255,0.12)',
                '&:hover': { bgcolor: active ? `${color ?? '#142E3D'}66` : 'rgba(255,255,255,0.1)' },
              }}
            />
          )
        })}
      </Stack>
    </Stack>
  )
}
