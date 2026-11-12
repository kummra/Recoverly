import { Logo } from "@/components/logo";
import { QrCode } from "@/components/qr-code";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { HELPLINES } from "@/lib/safety";
import { type PosterSettings, joinUrl, shortUrl } from "@/lib/toolkit";

/**
 * A poster, or a sheet of pocket cards, for an organisation to print and put up
 * or hand out. The words are the app's own, already translated, and appear in the
 * language chosen for the poster (not the language of whoever is making it).
 *
 * It is always dark on white, whatever the theme, because it is for paper and a
 * QR code needs the contrast. Rules that must stay true:
 * - The crisis line and the sudden-stop warning are on the poster, in its language.
 *   A poster that invites people to cut down or stop must not be the only thing
 *   they read before they stop abruptly.
 * - Nothing here says the organisation can see who joined. It cannot.
 * - `code` must already be known to exist: a QR code that leads to "we do not
 *   recognise that code" is worse than none. The caller checks.
 */
export function PosterSheet({ settings }: { settings: PosterSettings }) {
  const { org, code, locale, format } = settings;
  const t = createTranslator(locale);
  const url = joinUrl(code);
  const address = shortUrl(url);
  const tele = HELPLINES.india.teleManas;
  const emergency = HELPLINES.india.emergency;

  if (format === "cards") {
    return (
      <div lang={locale} className="card-sheet grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <section key={i} className="print-card flex gap-3 rounded-xl border border-dashed border-neutral-400 bg-white p-3 text-neutral-900">
            <QrCode text={url} label={address} className="h-24 w-24 shrink-0 self-start" />
            <div className="min-w-0 text-left">
              <p className="flex items-center gap-1.5">
                <Logo className="h-5 w-5 shrink-0" />
                <span className="text-sm font-bold">Recoverly</span>
              </p>
              <p className="mt-1 text-xs font-medium leading-snug">{t("poster.sub")}</p>
              <p className="mt-1 text-xs">{t("poster.scan")}</p>
              <p className="break-all text-xs font-medium">{address}</p>
              {code && <p className="text-xs font-bold tracking-wider">{code}</p>}
              <p className="mt-1 text-xs">
                {t("support.teleManasName")} {tele} · {t("support.emergencyName")} {emergency}
              </p>
              {org && <p className="mt-1 text-[11px] text-neutral-600">{t("poster.orgLine", { org })}</p>}
              <p className="mt-1 text-[10px] text-neutral-500">{t("footer.disclaimer")}</p>
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <article lang={locale} className="poster-sheet mx-auto flex w-full max-w-[34rem] flex-col items-center rounded-2xl border border-neutral-300 bg-white p-8 text-center text-neutral-900 shadow-sm">
      <p className="flex items-center gap-2">
        <Logo className="h-9 w-9" />
        <span className="text-xl font-bold tracking-tight">Recoverly</span>
      </p>
      <h2 className="mt-8 text-3xl font-bold leading-tight sm:text-4xl">{t("poster.headline")}</h2>
      <p className="mt-3 text-lg leading-snug text-neutral-700">{t("poster.sub")}</p>

      <div className="mt-8 rounded-2xl border-2 border-emerald-600 p-3">
        <QrCode text={url} label={address} className="h-56 w-56" />
      </div>
      <p className="mt-3 text-xl font-semibold">{t("poster.scan")}</p>
      <p className="mt-1 break-all text-base font-medium text-neutral-800">{address}</p>
      {code && (
        <p className="mt-2 text-base">
          <span className="text-neutral-600">{t("programme.title")}: </span>
          <strong className="tracking-widest">{code}</strong>
        </p>
      )}
      {org && <p className="mt-4 text-base text-neutral-700">{t("poster.orgLine", { org })}</p>}

      <div className="mt-auto w-full pt-8 text-left">
        <div className="rounded-xl border border-neutral-300 p-4">
          <p className="text-sm font-semibold">{t("safety.crisisTitle")}</p>
          <p className="mt-2 text-sm">
            <strong>
              {t("support.teleManasName")} {tele}
            </strong>{" "}
            · {t("support.teleManasDetail")}
          </p>
          <p className="mt-1 text-sm">
            <strong>
              {t("support.emergencyName")} {emergency}
            </strong>{" "}
            · {t("support.emergencyDetail")}
          </p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">{t("safety.notMedicalBody")}</p>
      </div>
    </article>
  );
}
