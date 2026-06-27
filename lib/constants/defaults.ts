// Magic number constants and default values
// These constants are used throughout the application to avoid magic numbers
// and provide centralized configuration

// Color and hex parsing constants
export const HEX_COLOR_SHORTHAND_LENGTH = 3;
export const HEXADECIMAL_BASE = 16;
export const HEX_COLOR_COMPONENT_LENGTH = 2;
export const HEX_COLOR_FULL_LENGTH = 6; // Full hex color length (e.g., #RRGGBB)

// UI defaults
export const DEFAULT_BACKGROUND_OPACITY = 0.9;
export const DEFAULT_LOGO_HEIGHT = 56;
export const DEFAULT_LOGO_WIDTH = 185;

// Content defaults
export const DEFAULT_DESCRIPTION_LENGTH = 500;
export const LATEST_JOBS_COUNT = 7;

// UI layout constants
export const TRIGGER_WIDTH_SM = 80;
export const TRIGGER_WIDTH_MD = 90;
export const TRIGGER_HEIGHT = 7;
export const SORT_TRIGGER_WIDTH = 130;
export const SORT_TRIGGER_WIDTH_SM = 110;

// Pagination constants
export const DEFAULT_PER_PAGE = 10;
export const PER_PAGE_OPTIONS = [5, 10, 25, 50, 100] as const;

// ARIA label constants
export const MIN_WIDTH_SELECT = 90;

// Pagination constants
export const PAGINATION_DELTA = 2;
export const LOADING_STATE_DELAY = 300;

// Time constants
export const MILLISECONDS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_MONTH = 30;

// Derived time constants
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;
export const SECONDS_PER_MONTH = SECONDS_PER_DAY * DAYS_PER_MONTH;

// Derived time constants
export const RATE_LIMIT_WINDOW_MS =
  MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

// Salary computation constants
export const HOURS_PER_YEAR = 2080; // Standard annual work hours (52 weeks × 40 hrs)

// Salary range tier thresholds (in USD, annual)
export const SALARY_TIER_1 = 50_000;
export const SALARY_TIER_2 = 100_000;
export const SALARY_TIER_3 = 200_000;

// Schema.org / job-validity defaults
export const MONTHS_PER_YEAR = 12;
export const DEFAULT_VALIDITY_DAYS = 30;
export const DEFAULT_EXPERIENCE_MONTHS = 12;

// Regex patterns for performance optimization
export const FONT_URL_REGEX =
  /src: url\((.+?)\) format\('(opentype|truetype)'\)/;
export const LEADING_DASHES_REGEX = /^-+/;
export const TRAILING_DASHES_REGEX = /-+$/;
export const WHITESPACE_REGEX = /\s/g;
export const PARENTHESIS_CONTENT_REGEX = /\s*\([^)]*\)\s*/g;
