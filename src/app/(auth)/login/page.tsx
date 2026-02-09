import LoginClient from './LoginClient'

type SearchParams = {
  error?: string | string[]
  redirectTo?: string | string[]
}

function getFirst(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const errorCode = getFirst(sp.error)
  const redirectTo = getFirst(sp.redirectTo) ?? ''

  const errorMessage =
    errorCode === 'bad_credentials'
      ? 'Rangt netfang eða lykilorð.'
      : errorCode === 'inactive'
        ? 'Aðgangur er óvirkur. Hafðu samband við stjórnanda.'
        : errorCode === 'rate_limit'
          ? 'Of margar tilraunir. Reyndu aftur eftir smá stund.'
          : errorCode === 'config'
            ? 'Kerfisvilla (stillingar).'
            : errorCode === 'no_user'
              ? 'Kerfisvilla (notandi fannst ekki).'
              : null

  return <LoginClient redirectTo={redirectTo} errorMessage={errorMessage} />
}
