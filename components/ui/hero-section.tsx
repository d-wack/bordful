import type { VariantProps } from 'class-variance-authority';
import Image from 'next/image';
import { Badge, type badgeVariants } from '@/components/ui/badge';
import config from '@/config';
import { cn } from '@/lib/utils';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

type HeroImageConfig = {
  enabled?: boolean;
  src?: string;
  alt?: string;
};

type HeroBackgroundImageOverlay = {
  enabled?: boolean;
  color?: string;
  opacity?: number;
};

type HeroBackgroundImageConfig = {
  enabled?: boolean;
  src?: string;
  position?: string;
  size?: string;
  overlay?: HeroBackgroundImageOverlay;
};

const DEFAULT_OVERLAY_OPACITY = 0.7;

type ResolvedHeroBackground = {
  heroStyle: React.CSSProperties;
  overlayStyle: React.CSSProperties;
  hasOverlay: boolean;
};

type GradientConfig = {
  enabled?: boolean;
  type?: string;
  direction?: string;
  colors?: readonly string[];
  stops?: readonly string[];
};

type HeroUiColors = {
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
  badgeVariant: BadgeVariant;
  badgeStyle: React.CSSProperties;
  gradient: GradientConfig | undefined;
  backgroundImage: HeroBackgroundImageConfig;
  globalImage: HeroImageConfig | undefined;
};

/** Read and normalise all hero-related config values in one place. */
function readHeroUiConfig(): HeroUiColors {
  const ui = config.ui;
  return {
    backgroundColor: ui.heroBackgroundColor ?? '',
    titleColor: ui.heroTitleColor ?? '',
    subtitleColor: ui.heroSubtitleColor ?? '',
    badgeVariant: (ui.heroBadgeVariant ?? 'outline') as BadgeVariant,
    badgeStyle: {
      backgroundColor: ui.heroBadgeBgColor || undefined,
      color: ui.heroBadgeTextColor || undefined,
      borderColor: ui.heroBadgeBorderColor || undefined,
    },
    gradient: ui.heroGradient as GradientConfig | undefined,
    backgroundImage: ui.heroBackgroundImage as HeroBackgroundImageConfig,
    globalImage: ui.heroImage as HeroImageConfig | undefined,
  };
}

/** Build a CSS gradient string from a gradient config, or return empty string. */
function computeGradient(heroGradient: GradientConfig): string {
  if (!(heroGradient.enabled && heroGradient.colors?.length)) {
    return '';
  }

  const { type, direction, colors, stops } = heroGradient;
  const colorStops = colors
    .map((color, index) => {
      const stop = stops?.[index] ? ` ${stops[index]}` : '';
      return `${color}${stop}`;
    })
    .join(', ');

  if (type === 'linear') {
    return `linear-gradient(${direction ?? 'to right'}, ${colorStops})`;
  }
  if (type === 'radial') {
    return `radial-gradient(${direction ?? 'circle'}, ${colorStops})`;
  }
  return '';
}

/** Resolve overlay style from a background-image overlay config. */
function buildOverlayStyle(
  overlay: HeroBackgroundImageOverlay | undefined
): React.CSSProperties | null {
  if (!(overlay?.enabled && overlay.color)) {
    return null;
  }
  return {
    backgroundColor: overlay.color,
    opacity:
      overlay.opacity !== undefined ? overlay.opacity : DEFAULT_OVERLAY_OPACITY,
  };
}

function resolveHeroBackground(
  heroBackgroundImage: HeroBackgroundImageConfig | undefined,
  heroGradient: GradientConfig | undefined,
  heroBackgroundColor: string
): ResolvedHeroBackground {
  if (heroBackgroundImage?.enabled && heroBackgroundImage.src) {
    const heroStyle: React.CSSProperties = {
      backgroundImage: `url(${heroBackgroundImage.src})`,
      backgroundPosition: heroBackgroundImage.position ?? 'center',
      backgroundSize: heroBackgroundImage.size ?? 'cover',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
    };

    const overlayStyle = buildOverlayStyle(heroBackgroundImage.overlay);
    if (overlayStyle) {
      return { heroStyle, overlayStyle, hasOverlay: true };
    }

    return { heroStyle, overlayStyle: {}, hasOverlay: false };
  }

  if (heroGradient) {
    const gradient = computeGradient(heroGradient);
    if (gradient) {
      return {
        heroStyle: { background: gradient },
        overlayStyle: {},
        hasOverlay: false,
      };
    }
  }

  if (heroBackgroundColor) {
    return {
      heroStyle: { backgroundColor: heroBackgroundColor },
      overlayStyle: {},
      hasOverlay: false,
    };
  }

  return { heroStyle: {}, overlayStyle: {}, hasOverlay: false };
}

type HeroSectionProps = {
  badge: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  heroImage?: HeroImageConfig;
};

export function HeroSection({
  badge,
  title,
  description,
  children,
  heroImage,
}: HeroSectionProps) {
  const {
    backgroundColor,
    titleColor,
    subtitleColor,
    badgeVariant,
    badgeStyle,
    gradient,
    backgroundImage,
    globalImage,
  } = readHeroUiConfig();

  const heroImageConfig = heroImage ?? globalImage;

  const { heroStyle, overlayStyle, hasOverlay } = resolveHeroBackground(
    backgroundImage,
    gradient,
    backgroundColor
  );

  return (
    <div className="relative overflow-hidden border-b" style={heroStyle}>
      {hasOverlay && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={overlayStyle}
        />
      )}
      <div className="container relative z-10 mx-auto px-0 py-6 sm:px-4 sm:py-8 md:px-6 md:py-12">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8 lg:gap-12">
          <div className="w-full space-y-3 px-4 sm:space-y-4 sm:px-0 md:w-1/2">
            <div className="space-y-2 sm:space-y-3">
              <Badge className="mb-1" style={badgeStyle} variant={badgeVariant}>
                {badge}
              </Badge>
              <h1
                className={cn(
                  'font-bold text-2xl tracking-tight sm:text-3xl md:text-4xl'
                )}
                style={{ color: titleColor || undefined }}
              >
                {title}
              </h1>
              <p
                className={cn('text-muted-foreground text-sm md:text-base')}
                style={{ color: subtitleColor || undefined }}
              >
                {description}
              </p>
            </div>
            {children}
          </div>

          {heroImageConfig?.enabled && heroImageConfig.src && (
            <div className="w-full px-4 sm:px-0 md:block md:w-1/2">
              <Image
                alt={heroImageConfig.alt || 'Hero image'}
                className="w-full rounded-lg object-cover md:w-auto"
                height={350}
                priority
                src={heroImageConfig.src}
                width={500}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
