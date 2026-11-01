import React from 'react';
import { NormalSkillId, PassiveSkillId, UltimateSkillId } from '../types/game';

export const HearthAndBoneTitleSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 540 130"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Hearth and Bone"
  >
    {/* Subtle warm lantern & bone crest above wordmark */}
    <g transform="translate(270, 24)">
      <path d="M-48 0 H-18" stroke="#C99342" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 0 H48" stroke="#C99342" strokeWidth="2" strokeLinecap="round" />
      <circle cx="0" cy="0" r="10" fill="#1F1B29" stroke="#4ADE80" strokeWidth="2" />
      <circle cx="0" cy="0" r="4" fill="#4ADE80" />
      <circle cx="-54" cy="0" r="2.5" fill="#C99342" />
      <circle cx="54" cy="0" r="2.5" fill="#C99342" />
    </g>

    {/* Shadow text */}
    <text
      x="270"
      y="86"
      textAnchor="middle"
      fill="#0D0A12"
      fontFamily="Fraunces, Georgia, serif"
      fontWeight="700"
      fontSize="54"
      letterSpacing="2"
    >
      HEARTH &amp; BONE
    </text>

    {/* Crisp ivory-gold main title */}
    <text
      x="270"
      y="82"
      textAnchor="middle"
      fill="#F5F0E6"
      stroke="#14101B"
      strokeWidth="2"
      paintOrder="stroke"
      fontFamily="Fraunces, Georgia, serif"
      fontWeight="700"
      fontSize="54"
      letterSpacing="2"
    >
      HEARTH &amp; BONE
    </text>

    {/* Subtitle */}
    <text
      x="270"
      y="112"
      textAnchor="middle"
      fill="#A7F3D0"
      fontFamily="Plus Jakarta Sans, sans-serif"
      fontWeight="600"
      fontSize="13"
      letterSpacing="3.5"
    >
      COZY GRAVEYARD ROGUELIKE
    </text>
  </svg>
);

export const NormalSkillIcon: React.FC<{ id: NormalSkillId; className?: string }> = ({
  id,
  className = 'w-6 h-6',
}) => {
  switch (id) {
    // Zombie Normal Skills
    case NormalSkillId.RottingClaw:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 18C7.5 12 12 7.5 19 4M7 20C10.5 14.5 14.5 10.5 20.5 7.5M3 13.5C6.5 9 10.5 5.5 15.5 3.5"
            stroke="#4ADE80"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case NormalSkillId.PlagueBurst:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="13" r="6" fill="#A3E635" fillOpacity="0.22" stroke="#A3E635" strokeWidth="2" />
          <circle cx="8" cy="8" r="2.5" stroke="#86EFAC" strokeWidth="1.8" />
          <circle cx="17" cy="8.5" r="2" stroke="#86EFAC" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="2" fill="#A3E635" />
        </svg>
      );
    case NormalSkillId.FleshRipper:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 17L19 5M19 5H12.5M19 5V11.5M4 20L15 11"
            stroke="#34D399"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case NormalSkillId.UndyingFlesh:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3L19 6V12C19 16.5 15.8 19.8 12 21C8.2 19.8 5 16.5 5 12V6L12 3Z"
            fill="#2DD4BF"
            fillOpacity="0.2"
            stroke="#2DD4BF"
            strokeWidth="2"
          />
          <path d="M12 8.5V15.5M8.5 12H15.5" stroke="#99F6E4" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.GraveCall:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 20V11C7 8.2 9.2 6 12 6C14.8 6 17 8.2 17 11V20"
            stroke="#86EFAC"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M4 20H20M12 10V15M9.5 12.5H14.5" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // Skeleton Normal Skills
    case NormalSkillId.BoneSlash:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M5 19L19 5M15 4C18.5 6.5 20 10.5 18.5 15"
            stroke="#38BDF8"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M4 15L9 20" stroke="#E2E8F0" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.BoneSpear:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 20L20 4M20 4L14 5.5M20 4L18.5 10"
            stroke="#7DD3FC"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="15" r="1.8" fill="#E2E8F0" />
        </svg>
      );
    case NormalSkillId.RibcageShield:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3V21M6 7C8 8.5 16 8.5 18 7M5 11.5C8 13 16 13 19 11.5M6.5 16C9 17.2 15 17.2 17.5 16"
            stroke="#E2E8F0"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );
    case NormalSkillId.SkeletalRush:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M3 12H19M19 12L14 7M19 12L14 17M6 7H11M6 17H11"
            stroke="#60A5FA"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
      case NormalSkillId.BoneStorm:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle
            cx="12"
            cy="12"
            r="7.5"
            stroke="#A5B4FC"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <path d="M12 7L14 12L12 17L10 12L12 7Z" fill="#38BDF8" />
        </svg>
      );

    // Goblin Normal Skills
    case NormalSkillId.DaggerFlurry:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 17L17 4M8 20L20 8M4 11L12 3"
            stroke="#F59E0B"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path d="M14 4H18V8" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case NormalSkillId.Shadowstep:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M5 17C5 12 8.5 8 14 8H19M19 8L15 4M19 8L15 12"
            stroke="#FBBF24"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6.5" cy="18" r="2.2" stroke="#94A3B8" strokeWidth="1.8" strokeDasharray="2 2" />
        </svg>
      );
    case NormalSkillId.ExplosiveTrap:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="13" r="6.5" fill="#FB923C" fillOpacity="0.22" stroke="#FB923C" strokeWidth="2" />
          <path d="M12 4L13.8 8.2L18 10L13.8 11.8L12 16L10.2 11.8L6 10L10.2 8.2L12 4Z" fill="#FDE047" />
        </svg>
      );
    case NormalSkillId.Windrunner:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M3 9H15.5C17.2 9 18.5 7.7 18.5 6C18.5 4.5 17.3 3.5 16 3.5M3 13.5H18.5C20.2 13.5 21.2 14.8 21.2 16.2C21.2 17.7 20 18.8 18.5 18.8M5 18H12"
            stroke="#FDE047"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );
    case NormalSkillId.PoisonedBlades:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M5 19L16 5L19 8L8 19H5Z"
            fill="#A3E635"
            fillOpacity="0.25"
            stroke="#A3E635"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="17.5" cy="15.5" r="2.2" fill="#84CC16" />
          <circle cx="14" cy="18.5" r="1.5" fill="#BEF264" />
        </svg>
      );

    // Gnome Normal Skills
    case NormalSkillId.IronFist:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect
            x="4"
            y="8"
            width="11"
            height="9"
            rx="2.5"
            fill="#FB923C"
            fillOpacity="0.26"
            stroke="#FB923C"
            strokeWidth="2"
          />
          <path
            d="M17 6C19.5 8.5 19.5 15.5 17 18M20 8.5C21.8 10.5 21.8 13.5 20 15.5"
            stroke="#FDBA74"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );
    case NormalSkillId.FortressStance:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3L20 6.5V12.5C20 17 16.5 20.2 12 21.5C7.5 20.2 4 17 4 12.5V6.5L12 3Z"
            fill="#FB923C"
            fillOpacity="0.24"
            stroke="#FB923C"
            strokeWidth="2.2"
          />
          <path d="M8 12H16M12 8V16" stroke="#FED7AA" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.Groundbreaker:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 4V14M12 14L8.5 10.5M12 14L15.5 10.5"
            stroke="#FB923C"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 18.5L8 16L12 19L16 16L20.5 18.5"
            stroke="#FDBA74"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case NormalSkillId.MagneticGuard:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 6V12C7 14.8 9.2 17 12 17C14.8 17 17 14.8 17 12V6"
            stroke="#FB923C"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path d="M5.5 6H8.5M15.5 6H18.5" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" stroke="#FDBA74" strokeWidth="1.4" strokeDasharray="3 3" />
        </svg>
      );
    case NormalSkillId.EarthenGrasp:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 20V11L9.5 8V13M12 20V7L14.5 9V13M17 20V10.5M4 20H20"
            stroke="#D97706"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M6 15.5H18" stroke="#FDBA74" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // Ghost Normal Skills
    case NormalSkillId.SpectralBolt:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M3 12H15M12 6L21 12L12 18L15 12L12 6Z"
            fill="#67E8F9"
            fillOpacity="0.28"
            stroke="#67E8F9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4 8.5H10M4 15.5H10" stroke="#C084FC" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.PhantomDash:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 15C7.5 15 9 9 13 9C16.5 9 17.5 12 20 12"
            stroke="#C084FC"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M3 10.5H9M6 18.5H14"
            stroke="#67E8F9"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="2.5 2.5"
          />
          <circle cx="18.5" cy="12" r="2.6" fill="#E879F9" />
        </svg>
      );
    case NormalSkillId.SoulDrain:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="3.5" fill="#C084FC" fillOpacity="0.35" stroke="#C084FC" strokeWidth="2" />
          <path
            d="M4 6C7.5 6 8.5 10 10.5 11M20 6C16.5 6 15.5 10 13.5 11M4 18C7.5 18 8.5 14 10.5 13M20 18C16.5 18 15.5 14 13.5 13"
            stroke="#67E8F9"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );
    case NormalSkillId.WailingScream:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="8" cy="12" r="3.5" stroke="#E879F9" strokeWidth="2" />
          <path
            d="M13.5 8.5C15.2 10.2 15.2 13.8 13.5 15.5M17 5.5C20 8.8 20 15.2 17 18.5"
            stroke="#C084FC"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );
    case NormalSkillId.HauntedPossession:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 19V11C7 7.8 9.2 5.5 12 5.5C14.8 5.5 17 7.8 17 11V19L14.5 17L12 19L9.5 17L7 19Z"
            fill="#818CF8"
            fillOpacity="0.25"
            stroke="#C084FC"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="11" r="1.4" fill="#67E8F9" />
          <circle cx="14" cy="11" r="1.4" fill="#67E8F9" />
        </svg>
      );

    // Kobold Normal Skills
    case NormalSkillId.PiercingBolt:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 12H19" stroke="#FB7185" strokeWidth="2.3" strokeLinecap="round" />
          <path
            d="M15 7.5L21 12L15 16.5L16.8 12L15 7.5Z"
            fill="#FB7185"
            fillOpacity="0.35"
            stroke="#FFE4E6"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M9 7V17M12.5 8.5V15.5" stroke="#FBBF24" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.RapidReload:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 8H16M13.5 5.5L17 8L13.5 10.5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 12.5H19M16.5 10L20 12.5L16.5 15" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17H15M12.5 14.5L16 17L12.5 19.5" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case NormalSkillId.ExplosiveBolt:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 16L12 11" stroke="#FB923C" strokeWidth="2.3" strokeLinecap="round" />
          <path
            d="M15 5L16.8 8.8L21 9.5L17.8 12.4L18.6 16.5L15 14.4L11.4 16.5L12.2 12.4L9 9.5L13.2 8.8L15 5Z"
            fill="#F97316"
            fillOpacity="0.35"
            stroke="#FDE047"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case NormalSkillId.SnareTrap:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <ellipse cx="12" cy="14" rx="8" ry="4.5" fill="#FBBF24" fillOpacity="0.2" stroke="#FBBF24" strokeWidth="2" />
          <path
            d="M6.5 13L8.5 10.5L10.5 13L12 10L13.5 13L15.5 10.5L17.5 13"
            stroke="#FB7185"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="14.5" r="1.8" fill="#FDE047" />
        </svg>
      );
    case NormalSkillId.MultiShot:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 12L19 6M16 4.8L19.5 5.8L17.8 9" stroke="#FDA4AF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12H20M17 9.5L20.5 12L17 14.5" stroke="#FB7185" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12L19 18M17.8 15L19.5 18.2L16 19.2" stroke="#FBBF24" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Slime Normal Skills
    case NormalSkillId.ArcaneOrb:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" fill="#818CF8" fillOpacity="0.25" stroke="#818CF8" strokeWidth="2" />
          <circle cx="12" cy="12" r="3.5" fill="#C084FC" />
          <path d="M12 2V5M12 19V22M2 12H5M19 12H22M5 5L7 7M17 17L19 19M19 5L17 7M5 19L7 17" stroke="#A855F7" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.PrismaticShards:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M6 19L11 6L8 5L3 18L6 19Z" fill="#38BDF8" fillOpacity="0.3" stroke="#38BDF8" strokeWidth="1.8" />
          <path d="M12 20L15 4L12 3L9 19L12 20Z" fill="#E879F9" fillOpacity="0.3" stroke="#E879F9" strokeWidth="1.8" />
          <path d="M18 19L21 8L18 7L15 18L18 19Z" fill="#FDE047" fillOpacity="0.3" stroke="#FDE047" strokeWidth="1.8" />
        </svg>
      );
    case NormalSkillId.GravityWell:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8" stroke="#A855F7" strokeWidth="1.8" strokeDasharray="3 3" />
          <circle cx="12" cy="12" r="3.2" fill="#312E81" stroke="#C084FC" strokeWidth="1.8" />
          <path d="M12 3V7M12 17V21M3 12H7M17 12H21" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 6L12 7L14 6M10 18L12 17L14 18M6 10L7 12L6 14M18 10L17 12L18 14" stroke="#C084FC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case NormalSkillId.ElementalCascade:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="7" cy="16" r="3" fill="#FB7185" stroke="#F43F5E" strokeWidth="1.6" />
          <circle cx="12" cy="9" r="3" fill="#38BDF8" stroke="#0EA5E9" strokeWidth="1.6" />
          <circle cx="17" cy="16" r="3" fill="#FDE047" stroke="#EAB308" strokeWidth="1.6" />
          <path d="M7 6L7 12M12 3L12 5M17 6L17 12" stroke="#C084FC" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.ArcanePrison:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <polygon points="12,3 20,8 20,16 12,21 4,16 4,8" stroke="#A855F7" strokeWidth="2" fill="#818CF8" fillOpacity="0.2" />
          <circle cx="12" cy="12" r="2.5" fill="#E879F9" />
          <line x1="8" y1="8" x2="16" y2="16" stroke="#67E8F9" strokeWidth="1.5" />
          <line x1="16" y1="8" x2="8" y2="16" stroke="#67E8F9" strokeWidth="1.5" />
        </svg>
      );

    // Lizardfolk Normal Skills
    case NormalSkillId.PiercingJavelin:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M3 12H19" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
          <polygon points="21,12 14,8 16,12 14,16" fill="#FDE047" stroke="#D97706" strokeWidth="1.4" />
          <path d="M7 9V15M10 10V14" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.TripleSpearToss:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 12L19 6M16 4.8L19.5 5.8L17.8 9" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12H20M17 9.5L20.5 12L17 14.5" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12L19 18M17.8 15L19.5 18.2L16 19.2" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case NormalSkillId.ImpalingSpear:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <line x1="12" y1="3" x2="12" y2="17" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
          <polygon points="12,21 8,14 12,16 16,14" fill="#FDE047" stroke="#059669" strokeWidth="1.5" />
          <line x1="5" y1="19" x2="19" y2="19" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case NormalSkillId.HuntingMark:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7.5" stroke="#FDE047" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M12 4V8M12 16V20M4 12H8M16 12H20" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="#F43F5E" />
        </svg>
      );
    case NormalSkillId.SpearCyclone:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7.5" stroke="#10B981" strokeWidth="1.8" strokeDasharray="5 3" />
          <path d="M12 4.5L16 6M19.5 12L18 16M4.5 12L6 8M12 19.5L8 18" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.2" fill="#059669" />
        </svg>
      );
  }
};

export const UltimateSkillIcon: React.FC<{ id: UltimateSkillId; className?: string }> = ({
  id,
  className = 'w-6 h-6',
}) => {
  switch (id) {
    // Zombie Ultimates
    case UltimateSkillId.AbominationForm:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M6 9L3 4L9 6.5M18 9L21 4L15 6.5"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="6" y="7" width="12" height="12" rx="4" fill="#4ADE80" fillOpacity="0.22" stroke="#4ADE80" strokeWidth="2" />
          <circle cx="9.5" cy="12.5" r="1.4" fill="#4ADE80" />
          <circle cx="14.5" cy="12.5" r="1.4" fill="#4ADE80" />
        </svg>
      );
    case UltimateSkillId.KingdomOfTheDead:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="9" r="3.2" stroke="#A3E635" strokeWidth="2" />
          <circle cx="6" cy="12" r="2.5" stroke="#86EFAC" strokeWidth="1.8" />
          <circle cx="18" cy="12" r="2.5" stroke="#86EFAC" strokeWidth="1.8" />
          <path d="M8 19C8 16.5 9.8 15 12 15C14.2 15 16 16.5 16 19" stroke="#A3E635" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case UltimateSkillId.DeathsEmbrace:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8.5" stroke="#2DD4BF" strokeWidth="1.8" strokeDasharray="3 3" />
          <circle cx="12" cy="12" r="4.5" fill="#2DD4BF" fillOpacity="0.28" stroke="#5EEAD4" strokeWidth="2" />
          <path d="M12 4V7M12 17V20M4 12H7M17 12H20" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // Skeleton Ultimates
    case UltimateSkillId.BoneColossus:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M5 8L3 3L9 6M19 8L21 3L15 6"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="6"
            y="6.5"
            width="12"
            height="12.5"
            rx="4.5"
            fill="#38BDF8"
            fillOpacity="0.24"
            stroke="#38BDF8"
            strokeWidth="2"
          />
          <circle cx="9.5" cy="12" r="1.5" fill="#7DD3FC" />
          <circle cx="14.5" cy="12" r="1.5" fill="#7DD3FC" />
          <path d="M9 16H15" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case UltimateSkillId.ArmyOfBones:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 4V18M9 7H15" stroke="#818CF8" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M6 8V19M4 10.5H8" stroke="#38BDF8" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M18 8V19M16 10.5H20" stroke="#38BDF8" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case UltimateSkillId.ReapersJudgment:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M6 20L16 5C19.5 6.5 21 10.5 19.5 14C17.5 11 14.5 9.5 12 9.5"
            stroke="#C084FC"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M5 14C8.5 17.5 13.5 19 19 17.5" stroke="#38BDF8" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );

    // Goblin Ultimates
    case UltimateSkillId.PhantomFrenzy:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 19L20 5M20 19L4 5"
            stroke="#F59E0B"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="7.5" stroke="#FDE68A" strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="12" cy="12" r="2.2" fill="#FDE047" />
        </svg>
      );
    case UltimateSkillId.KingOfThieves:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 17L6.5 8L12 12.5L17.5 8L20 17H4Z"
            fill="#FBBF24"
            fillOpacity="0.26"
            stroke="#FBBF24"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="6" r="1.6" fill="#FDE047" />
        </svg>
      );
    case UltimateSkillId.ThousandDaggers:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 4V16M7 16L4.5 13M7 16L9.5 13M12 6V19M12 19L9.5 16M12 19L14.5 16M17 4V16M17 16L14.5 13M17 16L19.5 13"
            stroke="#34D399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    // Gnome Ultimates
    case UltimateSkillId.MountainsHeart:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M3 19L9.5 6L14 13L16.5 9.5L21 19H3Z"
            fill="#FB923C"
            fillOpacity="0.26"
            stroke="#FB923C"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <circle cx="11" cy="14.5" r="2.2" fill="#FDE047" />
        </svg>
      );
    case UltimateSkillId.TitansRampart:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 19V7H8V10H10.5V7H13.5V10H16V7H20V19H4Z"
            fill="#D97706"
            fillOpacity="0.25"
            stroke="#FDBA74"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M4 14H20" stroke="#FB923C" strokeWidth="1.8" />
        </svg>
      );
    case UltimateSkillId.CataclysmicSlam:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="13" r="8.5" stroke="#FB923C" strokeWidth="1.9" strokeDasharray="4 2.5" />
          <circle cx="12" cy="13" r="4.5" fill="#F97316" fillOpacity="0.3" stroke="#FDE047" strokeWidth="2" />
          <path d="M12 3V8M5 7L8 10M19 7L16 10" stroke="#FED7AA" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // Ghost Ultimates
    case UltimateSkillId.EternalNightmare:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M3 12C5.8 7.5 8.8 6 12 6C15.2 6 18.2 7.5 21 12C18.2 16.5 15.2 18 12 18C8.8 18 5.8 16.5 3 12Z"
            fill="#A855F7"
            fillOpacity="0.26"
            stroke="#C084FC"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.8" fill="#67E8F9" />
        </svg>
      );
    case UltimateSkillId.SpiritLegion:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7.5" stroke="#C084FC" strokeWidth="1.6" strokeDasharray="3 3" />
          <circle cx="12" cy="4.5" r="2.3" fill="#67E8F9" />
          <circle cx="19" cy="15.5" r="2.3" fill="#E879F9" />
          <circle cx="5" cy="15.5" r="2.3" fill="#67E8F9" />
          <circle cx="12" cy="12" r="2.2" fill="#F8FAFC" />
        </svg>
      );
    case UltimateSkillId.DeathsPassage:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <ellipse cx="12" cy="13" rx="8.5" ry="5" stroke="#C084FC" strokeWidth="2" />
          <ellipse cx="12" cy="13" rx="4.5" ry="2.6" fill="#67E8F9" fillOpacity="0.3" stroke="#67E8F9" strokeWidth="1.8" />
          <path d="M12 4V10M8 6L10.5 9.5M16 6L13.5 9.5" stroke="#E879F9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // Kobold Ultimates
    case UltimateSkillId.DragonsBarrage:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <ellipse cx="12" cy="18.5" rx="8" ry="2.8" fill="#FB7185" fillOpacity="0.25" stroke="#FB7185" strokeWidth="1.8" />
          <path
            d="M7 4V14M7 14L5 11.5M7 14L9 11.5M12 3V16M12 16L10 13.5M12 16L14 13.5M17 4V14M17 14L15 11.5M17 14L19 11.5"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case UltimateSkillId.MasterArtificer:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M6 19L10 13H14L18 19" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9.5H19M15.5 6L20 9.5L15.5 13" stroke="#FB7185" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.6" fill="#FDE047" stroke="#78350F" strokeWidth="1.4" />
        </svg>
      );
    case UltimateSkillId.KoboldsDeadlyArsenal:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 8H18M15 5.5L19 8L15 10.5" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 12H20M17 9.5L21 12L17 14.5" stroke="#38BDF8" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16H18M15 13.5L19 16L15 18.5" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Slime Ultimates
    case UltimateSkillId.CataclysmOfElements:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8" stroke="#C084FC" strokeWidth="1.8" strokeDasharray="3 3" />
          <path d="M12 4L14 8L18 8L15 11L16 15L12 13L8 15L9 11L6 8L10 8Z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1.4" />
          <circle cx="6" cy="6" r="2" fill="#F43F5E" />
          <circle cx="18" cy="6" r="2" fill="#38BDF8" />
          <circle cx="6" cy="18" r="2" fill="#10B981" />
          <circle cx="18" cy="18" r="2" fill="#A855F7" />
        </svg>
      );
    case UltimateSkillId.AstralSingularity:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8.5" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx="12" cy="12" r="4.5" fill="#1E1B4B" stroke="#C084FC" strokeWidth="2" />
          <ellipse cx="12" cy="12" rx="10" ry="3.5" stroke="#67E8F9" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="1.8" fill="#F8FAFC" />
        </svg>
      );
    case UltimateSkillId.PrimordialOverload:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="6.5" fill="#C084FC" fillOpacity="0.3" stroke="#A855F7" strokeWidth="2" />
          <polygon points="12,2 15,6 12,10 9,6" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
          <polygon points="22,12 18,15 14,12 18,9" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />
          <polygon points="12,22 9,18 12,14 15,18" fill="#F43F5E" stroke="#E11D48" strokeWidth="1" />
          <polygon points="2,12 6,9 10,12 6,15" fill="#10B981" stroke="#059669" strokeWidth="1" />
          <circle cx="12" cy="12" r="2.8" fill="#FFFFFF" />
        </svg>
      );

    // Lizardfolk Ultimates
    case UltimateSkillId.RainOfJavelins:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M6 3V15M6 15L4 12M6 15L8 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2V18M12 18L9.5 15M12 18L14.5 15" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 3V15M18 15L16 12M18 15L20 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="3" y1="21" x2="21" y2="21" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case UltimateSkillId.WorldPiercer:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <line x1="2" y1="12" x2="22" y2="12" stroke="#FDE047" strokeWidth="2.8" strokeLinecap="round" />
          <polygon points="22,12 15,7 17,12 15,17" fill="#F59E0B" stroke="#78350F" strokeWidth="1.5" />
          <path d="M6 7C10 9 10 15 6 17M12 7C16 9 16 15 12 17" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case UltimateSkillId.SpiritOfTheGreatHunt:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 3C8 3 5 6 5 10C5 14 8 18 12 21C16 18 19 14 19 10C19 6 16 3 12 3Z" stroke="#10B981" strokeWidth="1.8" fill="#059669" fillOpacity="0.2" />
          <line x1="8" y1="6" x2="16" y2="16" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />
          <polygon points="17,17 13,15 15,13" fill="#FDE047" />
          <circle cx="12" cy="10" r="2.2" fill="#FBBF24" />
        </svg>
      );
  }
};

export const PassiveSkillIcon: React.FC<{ id: PassiveSkillId; className?: string }> = ({
  id,
  className = 'w-5 h-5',
}) => {
  switch (id) {
    case PassiveSkillId.CarrionHunger:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 20C12 20 5 15.2 5 9.8C5 7.2 7 5.2 9.5 5.2C10.9 5.2 12 6 12 6C12 6 13.1 5.2 14.5 5.2C17 5.2 19 7.2 19 9.8C19 15.2 12 20 12 20Z"
            fill="#4ADE80"
            fillOpacity="0.22"
            stroke="#4ADE80"
            strokeWidth="2"
          />
        </svg>
      );
    case PassiveSkillId.InfectiousTouch:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="3.5" fill="#A3E635" />
          <circle cx="6.5" cy="8.5" r="2" stroke="#A3E635" strokeWidth="1.8" />
          <circle cx="17.5" cy="8.5" r="2" stroke="#A3E635" strokeWidth="1.8" />
          <circle cx="12" cy="18.5" r="2" stroke="#A3E635" strokeWidth="1.8" />
        </svg>
      );
    case PassiveSkillId.EternalFramework:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3L19 6.5V12.5C19 16.5 15.8 19.6 12 21C8.2 19.6 5 16.5 5 12.5V6.5L12 3Z"
            fill="#38BDF8"
            fillOpacity="0.2"
            stroke="#38BDF8"
            strokeWidth="2"
          />
        </svg>
      );
    case PassiveSkillId.UnyieldingBones:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 17L17 7M7 7L17 17"
            stroke="#E2E8F0"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3" fill="#38BDF8" />
        </svg>
      );
    case PassiveSkillId.NimbleReflexes:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M4 14C7.5 8 13.5 6 20 8C15.5 11.5 13 15 12 20C9.5 16.5 7 15 4 14Z"
            fill="#FDE047"
            fillOpacity="0.22"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case PassiveSkillId.OpportunisticPredator:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke="#F59E0B" strokeWidth="2" />
          <path d="M12 3V7M12 17V21M3 12H7M17 12H21" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.2" fill="#F59E0B" />
        </svg>
      );
    case PassiveSkillId.UnbreakableFoundation:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <polygon
            points="12,3 20,8 20,16 12,21 4,16 4,8"
            fill="#FB923C"
            fillOpacity="0.24"
            stroke="#FB923C"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="2.6" fill="#FED7AA" />
        </svg>
      );
    case PassiveSkillId.LastingResolve:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3L19 6.5V12.5C19 16.5 15.8 19.6 12 21C8.2 19.6 5 16.5 5 12.5V6.5L12 3Z"
            stroke="#FB923C"
            strokeWidth="2"
          />
          <path
            d="M8.5 13.5L11 11L13 13L16 9.5"
            stroke="#FDE047"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case PassiveSkillId.EtherealBody:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 19V10.5C7 7.5 9.2 5 12 5C14.8 5 17 7.5 17 10.5V19L14.5 16.8L12 19L9.5 16.8L7 19Z"
            fill="#C084FC"
            fillOpacity="0.22"
            stroke="#C084FC"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
        </svg>
      );
    case PassiveSkillId.RestlessSpirit:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3C15.5 7 17.5 10 17.5 13.5C17.5 16.8 15 19.5 12 19.5C9 19.5 6.5 16.8 6.5 13.5C6.5 10 8.5 7 12 3Z"
            fill="#67E8F9"
            fillOpacity="0.24"
            stroke="#67E8F9"
            strokeWidth="2"
          />
          <circle cx="12" cy="14" r="2.2" fill="#C084FC" />
        </svg>
      );
    case PassiveSkillId.MechanicalExpertise:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="5" fill="#FBBF24" fillOpacity="0.22" stroke="#FBBF24" strokeWidth="2" />
          <path
            d="M12 3.5V6.2M12 17.8V20.5M3.5 12H6.2M17.8 12H20.5M6 6L8 8M16 16L18 18M18 6L16 8M8 16L6 18"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2" fill="#FB7185" />
        </svg>
      );
    case PassiveSkillId.HuntersPrecision:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7.5" stroke="#FB7185" strokeWidth="2" />
          <path d="M12 2.5V6.5M12 17.5V21.5M2.5 12H6.5M17.5 12H21.5" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.4" fill="#FDE047" />
        </svg>
      );

    // Slime Passives
    case PassiveSkillId.ArcaneConduit:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 3C8 8 5 12 5 16C5 19.8 8.2 22 12 22C15.8 22 19 19.8 19 16C19 12 16 8 12 3Z"
            fill="#818CF8"
            fillOpacity="0.25"
            stroke="#C084FC"
            strokeWidth="2"
          />
          <circle cx="12" cy="15" r="2.8" fill="#F8FAFC" />
          <path d="M12 8V12M9 14L10.5 14M15 14L13.5 14" stroke="#67E8F9" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case PassiveSkillId.UnstableMana:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="5" fill="#E879F9" fillOpacity="0.3" stroke="#A855F7" strokeWidth="2" />
          <path d="M12 3V6M12 18V21M3 12H6M18 12H21" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
          <path d="M5.5 5.5L7.8 7.8M16.2 16.2L18.5 18.5M18.5 5.5L16.2 7.8M7.8 16.2L5.5 18.5" stroke="#C084FC" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
        </svg>
      );

    // Lizardfolk Passives
    case PassiveSkillId.PredatorsAccuracy:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8" stroke="#10B981" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.5" stroke="#FDE047" strokeWidth="1.6" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="1.8" fill="#F43F5E" />
          <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case PassiveSkillId.HuntersInstinct:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M2 12C5 6.5 9.5 4 12 4C14.5 4 19 6.5 22 12C19 17.5 14.5 20 12 20C9.5 20 5 17.5 2 12Z"
            fill="#059669"
            fillOpacity="0.22"
            stroke="#10B981"
            strokeWidth="2"
          />
          <ellipse cx="12" cy="12" rx="3.5" ry="6" fill="#FDE047" />
          <line x1="12" y1="6" x2="12" y2="18" stroke="#064E3B" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
};

export const SoulShardIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M10 2L16 10L10 18L4 10L10 2Z" fill="#38BDF8" stroke="#0F172A" strokeWidth="1.5" />
  </svg>
);
