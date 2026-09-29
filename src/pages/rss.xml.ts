import type { RSSFeedItem } from "@astrojs/rss";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";

import { siteConfig } from "@/config";
import { getFeedContentItems } from "@/utils/feed-data";
import { escapeXml, toFeedLanguage } from "@/utils/feed-xml";

export async function GET(context: APIContext) {
	if (!context.site) throw new Error("site not set");

	const items: RSSFeedItem[] = (await getFeedContentItems(context.site)).map(
		(item) => ({
			title: item.title,
			description: item.description,
			pubDate: item.pubDate,
			link: item.link,
			content: item.content,
			categories: item.category ? [item.category] : undefined,
		}),
	);

	const selfUrl = new URL("rss.xml", context.site).href;

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site,
		items,
		xmlns: { atom: "http://www.w3.org/2005/Atom" },
		customData:
			`<language>${escapeXml(toFeedLanguage(siteConfig.lang))}</language>` +
			`<atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>`,
	});
}
