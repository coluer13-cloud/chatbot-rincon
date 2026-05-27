export interface GbpAccount {
  name: string
  accountName: string
  type: string
  verificationState: string
  vettedState: string
}

export interface GbpLocation {
  name: string
  title: string
  phoneNumbers?: {
    primaryPhone: string
    additionalPhones?: string[]
  }
  categories?: {
    primaryCategory: { name: string; displayName: string }
    additionalCategories?: { name: string; displayName: string }[]
  }
  storefrontAddress?: {
    addressLines: string[]
    locality: string
    administrativeArea: string
    postalCode: string
    regionCode: string
  }
  websiteUri?: string
  regularHours?: {
    periods: HoursPeriod[]
  }
  specialHours?: {
    specialHourPeriods: SpecialHourPeriod[]
  }
  profile?: {
    description: string
  }
  openInfo?: {
    status: 'OPEN' | 'CLOSED_PERMANENTLY' | 'CLOSED_TEMPORARILY'
    canReopen?: boolean
  }
  metadata?: {
    hasGoogleUpdated: boolean
    hasPendingEdits: boolean
    mapsUri: string
    newReviewUri: string
  }
  latlng?: { latitude: number; longitude: number }
  labels?: string[]
  adWordsLocationExtensions?: { adPhone: string }
  languageCode?: string
}

export interface HoursPeriod {
  openDay: string
  openTime: { hours: number; minutes: number }
  closeDay: string
  closeTime: { hours: number; minutes: number }
}

export interface SpecialHourPeriod {
  startDate: { year: number; month: number; day: number }
  endDate?: { year: number; month: number; day: number }
  openTime?: { hours: number; minutes: number }
  closeTime?: { hours: number; minutes: number }
  closed?: boolean
}

export interface GbpReview {
  name: string
  reviewId: string
  reviewer: {
    profilePhotoUrl: string
    displayName: string
    isAnonymous: boolean
  }
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
}

export interface GbpPost {
  name: string
  languageCode: string
  summary?: string
  callToAction?: {
    actionType: string
    url: string
  }
  createTime: string
  updateTime: string
  state: string
  media?: Array<{
    mediaFormat: string
    sourceUrl: string
  }>
  topicType: 'STANDARD' | 'EVENT' | 'OFFER' | 'ALERT'
  event?: {
    title: string
    schedule: {
      startDate: { year: number; month: number; day: number }
      startTime?: { hours: number; minutes: number }
      endDate: { year: number; month: number; day: number }
      endTime?: { hours: number; minutes: number }
    }
  }
  offer?: {
    couponCode?: string
    redeemOnlineUrl?: string
    termsConditions?: string
  }
}

export interface GbpPhoto {
  name: string
  mediaFormat: 'PHOTO' | 'VIDEO'
  googleUrl: string
  thumbnailUrl?: string
  createTime: string
  locationAssociation: {
    category:
      | 'COVER'
      | 'PROFILE'
      | 'LOGO'
      | 'INTERIOR'
      | 'EXTERIOR'
      | 'PRODUCT'
      | 'AT_WORK'
      | 'FOOD_AND_DRINK'
      | 'MENU'
      | 'COMMON_AREA'
      | 'ROOMS'
      | 'TEAMS'
      | 'ADDITIONAL'
      | 'VIDEO'
  }
  description?: string
  dimensions?: { widthPixels: number; heightPixels: number }
}

export interface GbpQuestion {
  name: string
  author: { displayName: string; profilePhotoUri: string; type: string }
  upvoteCount: number
  text: string
  createTime: string
  updateTime: string
  topAnswers?: GbpAnswer[]
  totalAnswerCount?: number
}

export interface GbpAnswer {
  name: string
  author: { displayName: string; profilePhotoUri: string; type: string }
  upvoteCount: number
  text: string
  createTime: string
  updateTime: string
}

export interface GbpAttribute {
  name: string
  valueType: string
  values: string[] | boolean[]
  repeatedEnumValue?: {
    setValues: string[]
    unsetValues: string[]
  }
  urlValues?: { url: string }[]
}
