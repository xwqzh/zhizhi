type PlainObject = Record<string, any>

const isPlainObject = (value: unknown): value is PlainObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const getListLike = (obj: PlainObject): any[] | undefined => {
  if (Array.isArray(obj.data)) return obj.data
  if (Array.isArray(obj.list)) return obj.list
  if (Array.isArray(obj.records)) return obj.records
  return undefined
}

const normalizePageShape = (obj: PlainObject): void => {
  const hasPageKeys =
    obj.pageNo !== undefined ||
    obj.pageSize !== undefined ||
    obj.page !== undefined ||
    obj.size !== undefined ||
    obj.total !== undefined ||
    Array.isArray(obj.list) ||
    Array.isArray(obj.records)

  if (!hasPageKeys) return

  const listLike = getListLike(obj)
  const pageNo = Number(obj.pageNo ?? obj.page ?? 1)
  const pageSize = Number(obj.pageSize ?? obj.size ?? (Array.isArray(listLike) ? listLike.length : 10))
  const total = Number(obj.total ?? (Array.isArray(listLike) ? listLike.length : 0))

  if (Number.isFinite(pageNo) && obj.pageNo === undefined) obj.pageNo = pageNo
  if (Number.isFinite(pageSize) && obj.pageSize === undefined) obj.pageSize = pageSize
  if (Number.isFinite(total) && obj.total === undefined) obj.total = total

  if (obj.data === undefined && Array.isArray(listLike)) {
    obj.data = listLike
  }
}

const normalizeAliasFields = (obj: PlainObject): void => {
  if (typeof obj.authorName === 'string' && !obj.userName) {
    obj.userName = obj.authorName
  }
  if (typeof obj.userName === 'string' && !obj.nickname) {
    obj.nickname = obj.userName
  }
  if (typeof obj.nickname === 'string' && !obj.userName) {
    obj.userName = obj.nickname
  }

  if (typeof obj.avatar === 'string' && !obj.userAvatar) {
    obj.userAvatar = obj.avatar
  }
  if (typeof obj.userAvatar === 'string' && !obj.avatar) {
    obj.avatar = obj.userAvatar
  }

  if (typeof obj.createdAt === 'string' && !obj.createTime) {
    obj.createTime = obj.createdAt
  }
  if (typeof obj.updatedAt === 'string' && !obj.updateTime) {
    obj.updateTime = obj.updatedAt
  }

  if (isPlainObject(obj.author)) {
    if (!obj.userName && typeof obj.author.nickname === 'string') {
      obj.userName = obj.author.nickname
    }
    if (!obj.avatar && typeof obj.author.avatar === 'string') {
      obj.avatar = obj.author.avatar
      if (!obj.userAvatar) obj.userAvatar = obj.author.avatar
    }
  }
}

const normalizeObjectDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      value[i] = normalizeObjectDeep(value[i])
    }
    return value
  }

  if (!isPlainObject(value)) {
    return value
  }

  normalizePageShape(value)
  normalizeAliasFields(value)

  const keys = Object.keys(value)
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    value[key] = normalizeObjectDeep(value[key])
  }
  return value
}

/**
 * Normalize response payload to reduce field drift across APIs.
 * Canonical fields are createTime/updateTime.
 * We only bridge legacy inbound fields to canonical names and do not emit legacy aliases.
 */
export const normalizeResponseData = <T = any>(data: T): T => {
  if (!data || typeof data !== 'object') {
    return data
  }
  return normalizeObjectDeep(data) as T
}
