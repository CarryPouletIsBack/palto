import type { ProjectData } from '../data/projectsNew';

type TFn = (key: string) => string;

interface BaseProps {
  projectData: ProjectData;
  isEn: boolean;
  t: TFn;
}

function buildPaletteRows(projectData: ProjectData, isEn: boolean) {
  const ds = projectData.designSystem;
  if (!ds) return [];
  return (ds.colorPalette?.categories?.neutrals?.colors ?? []).slice(0, 7).map(
    (c: { role: string; usage?: string; color: string }, i: number) => {
      const en = isEn && projectData.translations?.en?.designSystemNeutrals?.[i];
      return { role: en?.role ?? c.role, usage: en?.usage ?? (c as { usage?: string }).usage ?? '', color: c.color };
    }
  );
}

function buildTypoRows(projectData: ProjectData) {
  const ds = projectData.designSystem;
  if (!ds) return [];
  return (ds.typography?.items ?? []).slice(0, 7).map((item: { style: string; font: string; size: string; lineHeight: string }) => {
    const sizeNum = parseInt(item.size, 10) || 16;
    const weight = item.font.toLowerCase().includes('bold')
      ? 700
      : item.font.toLowerCase().includes('semi')
        ? 600
        : item.font.toLowerCase().includes('medium')
          ? 500
          : 400;
    return {
      role: item.style,
      typo: item.font,
      size: `${item.size}px`,
      line: item.lineHeight,
      weight,
      sizePx: sizeNum,
      example: 'The Quick Brown Fox Jumps Over The Lazy Dog',
    };
  });
}

/** Table palette seule */
export function PlaydagoPaletteTable({ projectData, isEn, t }: BaseProps) {
  const ds = projectData.designSystem;
  if (!ds) return null;
  const paletteRows = buildPaletteRows(projectData, isEn);

  return (
    <div className="playdago-ds-tables playdago-ds-tables--palette">
      <h3 className="figma-palette-title">{`Palette "${projectData.title}"`}</h3>
      <p className="figma-caption">{t('project.materialDesign')}</p>
      <div className="figma-palette-table">
        <div className="figma-palette-header">
          <span>{t('project.roleToken')}</span>
          <span>{t('project.usage')}</span>
          <span className="figma-palette-header-hex">{t('project.hexValue')}</span>
        </div>
        {paletteRows.map((c: { role: string; usage: string; color: string }, i: number) => (
          <div key={i} className="figma-palette-row">
            <span>{c.role}</span>
            <span>{c.usage}</span>
            <span className="figma-swatch" style={{ backgroundColor: c.color }}>
              {c.color}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table typescale seule */
export function PlaydagoTypescaleTable({
  projectData,
  t,
  typographyHeadingId = 'typography',
}: Omit<BaseProps, 'isEn'> & { typographyHeadingId?: string }) {
  const ds = projectData.designSystem;
  if (!ds) return null;
  const typoRows = buildTypoRows(projectData);

  return (
    <div className="playdago-ds-tables playdago-ds-tables--typescale">
      <h3 id={typographyHeadingId} className="figma-typescale-title">
        {t('project.typescale')}
      </h3>
      <p className="figma-caption">{t('project.baseValue')}</p>
      <div className="figma-typescale-table">
        <div className="figma-typescale-header">
          <span>{t('project.roleCol')}</span>
          <span>{t('project.typography')}</span>
          <span>{t('project.size')}</span>
          <span>{t('project.lineHeight')}</span>
          <span>{t('project.example')}</span>
        </div>
        {typoRows.map(
          (
            row: { role: string; typo: string; size: string; line: string; weight: number; sizePx: number; example: string },
            i: number
          ) => (
            <div key={i} className="figma-typescale-row">
              <span className="figma-typescale-role">{row.role}</span>
              <span className="figma-typescale-typo">{row.typo}</span>
              <span className="figma-typescale-size">{row.size}</span>
              <span className="figma-typescale-line">{row.line}</span>
              <span className="figma-typescale-example" style={{ fontWeight: row.weight, fontSize: row.sizePx, lineHeight: 1.5 }}>
                {row.example}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
