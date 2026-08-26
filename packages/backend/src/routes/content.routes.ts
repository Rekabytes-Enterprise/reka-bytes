import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  classCreateSchema,
  classUpdateSchema,
  moduleCreateSchema,
  moduleUpdateSchema,
  lessonCreateSchema,
  lessonUpdateSchema,
  quizCreateSchema,
  quizUpdateSchema,
  questionCreateSchema,
  questionUpdateSchema,
  reorderSchema,
} from '@reka-bytes/shared';
import { authedUser, type AppEnv } from '../middleware/auth';
import {
  listClasses,
  getClassTree,
  createClass,
  updateClass,
  deleteClass,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorder,
} from '../services/content.service';

/**
 * Admin content management (PRD-02 §10.2).
 * Mounted under adminRoutes — the existing `.use('*', requireAdmin)` guard applies.
 */
export const contentRoutes = new Hono<AppEnv>()
  // Classes
  .get('/classes', async (c) => c.json({ data: await listClasses() }))
  .post('/classes', zValidator('json', classCreateSchema), async (c) => {
    const admin = authedUser(c);
    return c.json({ data: await createClass(c.req.valid('json'), admin.id) }, 201);
  })
  .get('/classes/:id', async (c) => c.json({ data: await getClassTree(c.req.param('id')) }))
  .put('/classes/:id', zValidator('json', classUpdateSchema), async (c) => {
    const admin = authedUser(c);
    return c.json({ data: await updateClass(c.req.param('id'), c.req.valid('json'), admin.id) });
  })
  .delete('/classes/:id', async (c) => {
    const admin = authedUser(c);
    await deleteClass(c.req.param('id'), admin.id);
    return c.json({ data: { ok: true } });
  })
  // Modules
  .post('/modules', zValidator('json', moduleCreateSchema), async (c) => {
    const admin = authedUser(c);
    return c.json({ data: await createModule(c.req.valid('json'), admin.id) }, 201);
  })
  .put('/modules/:id', zValidator('json', moduleUpdateSchema), async (c) =>
    c.json({ data: await updateModule(c.req.param('id'), c.req.valid('json')) }),
  )
  .delete('/modules/:id', async (c) => {
    const admin = authedUser(c);
    await deleteModule(c.req.param('id'), admin.id);
    return c.json({ data: { ok: true } });
  })
  // Lessons
  .post('/lessons', zValidator('json', lessonCreateSchema), async (c) => {
    const admin = authedUser(c);
    return c.json({ data: await createLesson(c.req.valid('json'), admin.id) }, 201);
  })
  .put('/lessons/:id', zValidator('json', lessonUpdateSchema), async (c) =>
    c.json({ data: await updateLesson(c.req.param('id'), c.req.valid('json')) }),
  )
  .delete('/lessons/:id', async (c) => {
    const admin = authedUser(c);
    await deleteLesson(c.req.param('id'), admin.id);
    return c.json({ data: { ok: true } });
  })
  // Quizzes
  .post('/quizzes', zValidator('json', quizCreateSchema), async (c) => {
    const admin = authedUser(c);
    return c.json({ data: await createQuiz(c.req.valid('json'), admin.id) }, 201);
  })
  .put('/quizzes/:id', zValidator('json', quizUpdateSchema), async (c) =>
    c.json({ data: await updateQuiz(c.req.param('id'), c.req.valid('json')) }),
  )
  .delete('/quizzes/:id', async (c) => {
    const admin = authedUser(c);
    await deleteQuiz(c.req.param('id'), admin.id);
    return c.json({ data: { ok: true } });
  })
  // Questions
  .post('/quizzes/:id/questions', zValidator('json', questionCreateSchema), async (c) =>
    c.json({ data: await createQuestion(c.req.param('id'), c.req.valid('json')) }, 201),
  )
  .put('/questions/:id', zValidator('json', questionUpdateSchema), async (c) =>
    c.json({ data: await updateQuestion(c.req.param('id'), c.req.valid('json')) }),
  )
  .delete('/questions/:id', async (c) => {
    await deleteQuestion(c.req.param('id'));
    return c.json({ data: { ok: true } });
  })
  // Reorder
  .post('/content/reorder', zValidator('json', reorderSchema), async (c) => {
    await reorder(c.req.valid('json'));
    return c.json({ data: { ok: true } });
  });
