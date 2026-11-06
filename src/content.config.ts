import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const localImage = z.string().regex(/^images\/.+\.(svg|webp|avif|png|jpe?g)$/i, 'Use an image path relative to public/, such as images/project.webp');
const rotation = z.union([z.literal(0), z.literal(-90), z.literal(90), z.literal(180)]);
const mediaCaption = z.string().optional();
const localVideo = z.string().regex(/^videos\/.+\.(mp4|webm)$/i, 'Use a video path relative to public/, such as videos/prototype.mp4');
const storyMedia = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    src: localImage,
    alt: z.string().min(1),
    caption: mediaCaption,
    fit: z.enum(['cover', 'contain']).default('contain'),
    rotation: rotation.default(0),
    zoom: z.number().min(1).max(4).optional(),
  }),
  z.object({
    type: z.literal('slideshow'),
    images: z.array(z.object({ src: localImage, alt: z.string().min(1) })).min(2),
    interval: z.number().int().min(1000).max(60000).default(5000),
    fit: z.enum(['cover', 'contain']).default('contain'),
    caption: mediaCaption,
  }),
  z.object({
    type: z.literal('video'),
    src: localVideo,
    playlist: z.array(localVideo).default([]),
    clipLabels: z.array(z.string().min(1)).default([]),
    clipZooms: z.array(z.number().min(1).max(4)).default([]),
    poster: localImage.optional(),
    label: z.string().min(1),
    caption: mediaCaption,
  }),
  z.object({ type: z.literal('placeholder'), caption: mediaCaption }),
]);
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    projectId: z.string().regex(/^BM-\d{3}$/),
    title: z.string(),
    description: z.string(),
    category: z.array(z.string()).min(1),
    year: z.number().int().optional(),
    thumbnail: localImage.optional(),
    hero: localImage.optional(),
    imageAlt: z.string().min(1).optional(),
    thumbnailFit: z.enum(['cover', 'contain']).default('cover'),
    thumbnailZoom: z.number().min(1).max(4).optional(),
    imageRotation: rotation.default(0),
    tools: z.array(z.string()).default([]),
    featured: z.boolean().default(true),
    order: z.number().int(),
    placeholder: z.boolean().default(true),
    sections: z.array(z.object({
      title: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
      media: storyMedia,
    })).default([]),
    videoUrl: z.url().optional(),
    githubUrl: z.url().optional(),
  }).refine(({ thumbnail, hero, imageAlt }) => !(thumbnail || hero) || Boolean(imageAlt), {
    message: 'Add descriptive imageAlt text when providing a thumbnail or hero image.',
    path: ['imageAlt'],
  }),
});

export const collections = { projects };
