Informe de la API Noema

Informe técnico de implementación y validación

# 1\. Propósito y alcance

Este informe describe el backend de Noema, desarrollado con NestJS. La API gestiona usuarios y perfiles, artículos, lectura, comunidades, interacciones sociales, planes, suscripciones y notificaciones. También documenta las rutas, los mecanismos de autenticación y autorización, la persistencia con PostgreSQL y las pruebas ejecutadas por el equipo.

El informe se elaboró a partir del código y de las evidencias compartidas por el equipo. Se revisaron la compilación local, las pruebas automatizadas, las colecciones de Postman y la ejecución del seed de autenticación. También se revisó el workflow de GitHub Actions y una corrida de validación del pipeline.

# 2\. Tecnologías y organización

El proyecto utiliza NestJS con TypeScript para organizar la API en módulos, controladores y servicios. PostgreSQL es el motor relacional y TypeORM gestiona las entidades y consultas. La validación de los cuerpos de solicitud se configura mediante ValidationPipe, class-validator y class-transformer. Passport y JWT resuelven la autenticación basada en tokens. Jest y Supertest se incluyen para las pruebas, mientras Docker Compose permite iniciar PostgreSQL en desarrollo.

La aplicación separa sus funcionalidades en módulos de autenticación, perfiles, artículos, comunidades, lectura, interacción social, monetización y notificaciones. Esta organización permite ubicar las rutas HTTP en sus controladores y la lógica de negocio en los servicios correspondientes.

# 3\. Funcionalidades implementadas en el código

| **Área** | **Alcance observado en el código** |
| --- | --- |
| Autenticación y acceso | Inicio de sesión mediante JWT; administración de usuarios, roles y permisos. |
| Perfiles | Consulta y actualización de perfiles, preferencias y relaciones de seguimiento. |
| Contenido | Artículos con estados, reseñas, etiquetas y colecciones. |
| Comunidades | Gestión de comunidades y membresías. |
| Lectura | Listas de lectura, marcadores, favoritos y progreso. |
| Interacción social | Publicaciones, comentarios y reacciones. |
| Monetización | Planes, suscripciones y operaciones de pago. |
| Notificaciones | Consulta, lectura y administración de notificaciones. |

# 4\. Autenticación y autorización

La ruta POST /auth/login recibe las credenciales, consulta el usuario y compara la contraseña con bcrypt. Si las credenciales son válidas y la cuenta está activa, la API firma un JWT con el identificador del usuario, correo, roles, permisos y un identificador único (jti). Los usuarios autorizados pueden asignar roles mediante roleIds, y cada rol asocia permisos mediante permissionIds. Las rutas protegidas validan el token con Passport; los controladores de roles y permisos requieren el permiso manage\_roles, mientras que las operaciones administrativas sobre usuarios exigen manage\_users.

El cierre de sesión se implementa en POST /auth/logout, una ruta protegida que recibe el JWT Bearer vigente. Al iniciar sesión, cada token obtiene un jti; al cerrar sesión, la API guarda ese identificador en revoked\_tokens hasta la expiración del token. JwtStrategy consulta los identificadores revocados y rechaza el token, incluso si aún no ha expirado. En la colección Auth actualizada, Postman confirmó la respuesta 200 al cerrar sesión y el 401 al intentar consultar /users con el mismo token revocado.

# 5\. Persistencia y datos iniciales

La conexión a PostgreSQL se configura desde variables de entorno como DB\_HOST, DB\_PORT, DB\_USERNAME, DB\_PASSWORD y DB\_NAME. TypeORM carga las entidades registradas por los módulos y tiene synchronize: true, por lo que crea o ajusta el esquema al iniciar. Esta configuración facilita el desarrollo; antes de producción se debe valorar el uso de migraciones.

La ejecución local de db/seed-auth.sql terminó correctamente. La salida reportó 3 permisos, 2 roles, 3 asignaciones de permisos, 1 usuario y 1 asignación de rol insertados. Esto confirma que PostgreSQL estaba disponible y que las tablas de autenticación ya existían.

# 6\. Pruebas y evidencia

En la validación local más reciente, npm run build terminó correctamente y npm test reportó 50 suites y 410 pruebas unitarias aprobadas, con una cobertura global de 77.6 % en sentencias, 76.5 % en ramas, 60.2 % en funciones y 78.3 % en líneas. Además, npm run test:e2e ejecutó 2 suites y 20 pruebas de integración con supertest, todas aprobadas: levantan la aplicación completa sobre una base PostgreSQL separada (noema\_test) y cubren auth, users, roles, permissions, profiles, preferences, follows, notifications, articles, social, communities, monetization y reading. En Postman se ejecutaron las ocho colecciones: Auth (15), Articles (16), Communities (20), Monetization (18), Notifications (19), Profiles (18), Reading (18) y Social (15), para 139 comprobaciones aprobadas en total. No hubo pruebas fallidas, omitidas ni errores. La colección Auth validó POST /auth/logout y el rechazo posterior del JWT revocado con 401.

# 7\. Matriz detallada de endpoints

La matriz se levantó de los controladores del snapshot draft-develop y se complementó con POST /auth/logout, implementado y probado durante la revisión. Incluye 116 operaciones HTTP (combinaciones de método y ruta), expuestas sin prefijo global. Los DTO determinan los campos admitidos en el cuerpo o en la consulta; sus campos principales se resumen después de la matriz. Para cada operación se indican la ruta, los parámetros, los requisitos de acceso y la respuesta exitosa observada en el código.

## Artículos, reseñas, colecciones y etiquetas

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| POST /articles | JSON: CreateArticleDto | Requiere JWT | 201: objeto artículo devuelto por el servicio |
| GET /articles | Query: FindArticlesQueryDto | JWT opcional | 200: página {data, total, page, limit} |
| GET /articles/mine | Query: PaginationQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /articles/mine/:id | Ruta: id (entero positivo) | Requiere JWT | 200: datos de artículo (objeto JSON) |
| GET /articles/:id | Ruta: id (entero positivo) | JWT opcional | 200: datos de artículo (objeto JSON) |
| PATCH /articles/:id | Ruta: id (entero positivo); JSON: UpdateArticleDto | Requiere JWT | 200: objeto artículo devuelto por el servicio |
| PATCH /articles/:id/status | Ruta: id (entero positivo); JSON: UpdateArticleStatusDto | Requiere JWT | 200: objeto artículo devuelto por el servicio |
| DELETE /articles/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| POST /collections | JSON: CreateCollectionDto | Requiere JWT | 201: objeto colección devuelto por el servicio |
| GET /collections | Query: FindCollectionsQueryDto | Sin guard JWT declarado | 200: arreglo de colecciones |
| GET /collections/:id | Ruta: id (entero positivo) | Sin guard JWT declarado | 200: datos de colección (objeto JSON) |
| PATCH /collections/:id | Ruta: id (entero positivo); JSON: UpdateCollectionDto | Requiere JWT | 200: objeto colección devuelto por el servicio |
| DELETE /collections/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| POST /reviews | JSON: CreateReviewDto | Requiere JWT | 201: objeto reseña devuelto por el servicio |
| GET /reviews/article/:articleId | Ruta: articleId (entero positivo) | JWT opcional | 200: arreglo de reseñas |
| PATCH /reviews/:id | Ruta: id (entero positivo); JSON: UpdateReviewDto | Requiere JWT | 200: objeto reseña devuelto por el servicio |
| DELETE /reviews/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| GET /article-tags | Sin parámetros ni cuerpo | Sin guard JWT declarado | 200: arreglo de etiquetas |
| GET /article-tags/article/:articleId | Ruta: articleId (entero positivo) | JWT opcional | 200: arreglo de etiquetas |
| PUT /article-tags/article/:articleId | Ruta: articleId (entero positivo); JSON: ReplaceArticleTagsDto | Requiere JWT | 200: objeto etiquetas devuelto por el servicio |

## Autenticación y acceso

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| POST /auth/login | JSON: UserLoginDto | Sin guard JWT declarado | 200: {access\_token, token\_type, user} |
| POST /auth/logout | Header Authorization: Bearer <JWT> | Requiere JWT | 200: {message: "Sesión cerrada correctamente"} |
| POST /permissions | JSON: CreatePermissionDto | JWT + permiso manage\_roles | 201: objeto permiso devuelto por el servicio |
| GET /permissions | Sin parámetros ni cuerpo | JWT + permiso manage\_roles | 200: lista de permisos |
| GET /permissions/:id | Ruta: id (entero positivo) | JWT + permiso manage\_roles | 200: datos de permiso (objeto JSON) |
| PATCH /permissions/:id | Ruta: id (entero positivo); JSON: UpdatePermissionDto | JWT + permiso manage\_roles | 200: objeto permiso devuelto por el servicio |
| DELETE /permissions/:id | Ruta: id (entero positivo) | JWT + permiso manage\_roles | 204: sin cuerpo |
| POST /roles | JSON: CreateRoleDto | JWT + permiso manage\_roles | 201: objeto rol devuelto por el servicio |
| GET /roles | Sin parámetros ni cuerpo | JWT + permiso manage\_roles | 200: lista de roles |
| GET /roles/:id | Ruta: id (entero positivo) | JWT + permiso manage\_roles | 200: datos de rol (objeto JSON) |
| PATCH /roles/:id | Ruta: id (entero positivo); JSON: UpdateRoleDto | JWT + permiso manage\_roles | 200: objeto rol devuelto por el servicio |
| DELETE /roles/:id | Ruta: id (entero positivo) | JWT + permiso manage\_roles | 204: sin cuerpo |
| POST /users | JSON: CreateUserDto | Sin guard JWT (registro público) | 201: objeto usuario devuelto por el servicio |
| GET /users | Sin parámetros ni cuerpo | JWT + permiso manage\_users | 200: lista de usuarios |
| GET /users/:id | Ruta: id (entero positivo) | JWT + permiso manage\_users | 200: datos de usuario (objeto JSON) |
| PATCH /users/:id | Ruta: id (entero positivo); JSON: UpdateUserDto | JWT + permiso manage\_users | 200: objeto usuario devuelto por el servicio |
| DELETE /users/:id | Ruta: id (entero positivo) | JWT + permiso manage\_users | 204: sin cuerpo |

## Comunidades y membresías

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| POST /communities | JSON: CreateCommunityDto | Requiere JWT | 201: objeto comunidad devuelto por el servicio |
| GET /communities | Query: FindCommunitiesQueryDto | Sin guard JWT declarado | 200: página {data, total, page, limit} |
| GET /communities/mine | Query: PaginationQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /communities/:id | Ruta: id (entero positivo) | Sin guard JWT declarado | 200: datos de comunidad (objeto JSON) |
| PATCH /communities/:id | Ruta: id (entero positivo); JSON: UpdateCommunityDto | Requiere JWT | 200: objeto comunidad devuelto por el servicio |
| PUT /communities/:id/tags | Ruta: id (entero positivo); JSON: ReplaceCommunityTagsDto | Requiere JWT | 200: objeto comunidad devuelto por el servicio |
| DELETE /communities/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| POST /communities/:communityId/members | Ruta: communityId (entero positivo) | Requiere JWT | 201: objeto comunidad devuelto por el servicio |
| GET /communities/:communityId/members | Ruta: communityId (entero positivo); Query: FindMembersQueryDto | JWT opcional | 200: página {data, total, page, limit} |
| DELETE /communities/:communityId/members/me | Ruta: communityId (entero positivo) | Requiere JWT | 204: sin cuerpo |
| PATCH /communities/:communityId/members/:profileId | Ruta: communityId (entero positivo), profileId (entero positivo); JSON: UpdateMembershipDto | Requiere JWT | 200: objeto comunidad devuelto por el servicio |
| DELETE /communities/:communityId/members/:profileId | Ruta: communityId (entero positivo), profileId (entero positivo) | Requiere JWT | 204: sin cuerpo |

## Monetización

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| GET /payments | Query: FindPaymentsQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /payments/:id | Ruta: id (entero positivo) | Requiere JWT | 200: datos de pago (objeto JSON) |
| POST /payments/:id/refund | Ruta: id (entero positivo) | JWT + permiso manage\_payments | 200: objeto pago devuelto por el servicio |
| POST /plans | JSON: CreatePlanDto | Requiere JWT | 201: objeto plan devuelto por el servicio |
| GET /plans | Query: FindPlansQueryDto | Sin guard JWT declarado | 200: página {data, total, page, limit} |
| GET /plans/mine | Query: PaginationQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /plans/:id | Ruta: id (entero positivo) | Sin guard JWT declarado | 200: datos de plan (objeto JSON) |
| PATCH /plans/:id | Ruta: id (entero positivo); JSON: UpdatePlanDto | Requiere JWT | 200: objeto plan devuelto por el servicio |
| DELETE /plans/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| POST /subscriptions | JSON: CreateSubscriptionDto | Requiere JWT | 201: objeto suscripción devuelto por el servicio |
| GET /subscriptions | Query: PaginationQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /subscriptions/:id | Ruta: id (entero positivo) | Requiere JWT | 200: datos de suscripción (objeto JSON) |
| POST /subscriptions/:id/renew | Ruta: id (entero positivo); JSON: RenewSubscriptionDto | Requiere JWT | 200: objeto suscripción devuelto por el servicio |
| POST /subscriptions/:id/cancel | Ruta: id (entero positivo) | Requiere JWT | 200: objeto suscripción devuelto por el servicio |

## Notificaciones

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| GET /notifications | Query: FindNotificationsQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /notifications/unread-count | Sin parámetros ni cuerpo | Requiere JWT | 200: {unread} |
| POST /notifications/read-all | Sin parámetros ni cuerpo | Requiere JWT | 200: {updated} |
| PATCH /notifications/:id/read | Ruta: id (entero positivo) | Requiere JWT | 200: objeto notificación devuelto por el servicio |
| DELETE /notifications/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |

## Perfiles

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| POST /follows/:profileId | Ruta: profileId (entero positivo) | Requiere JWT | 201: objeto seguimiento devuelto por el servicio |
| DELETE /follows/:profileId | Ruta: profileId (entero positivo) | Requiere JWT | 204: sin cuerpo |
| GET /follows/followers/:profileId | Ruta: profileId (entero positivo) | Sin guard JWT declarado | 200: arreglo de perfiles |
| GET /follows/following/:profileId | Ruta: profileId (entero positivo) | Sin guard JWT declarado | 200: arreglo de perfiles |
| GET /preferences | Sin parámetros ni cuerpo | Requiere JWT | 200: arreglo de etiquetas de preferencia |
| PUT /preferences | JSON: CreatePreferenceDto | Requiere JWT | 200: objeto preferencias devuelto por el servicio |
| POST /profiles | JSON: CreateProfileDto | Requiere JWT | 201: objeto perfil devuelto por el servicio |
| GET /profiles/me | Sin parámetros ni cuerpo | Requiere JWT | 200: objeto perfil |
| PATCH /profiles/me | JSON: UpdateProfileDto | Requiere JWT | 200: objeto perfil devuelto por el servicio |
| DELETE /profiles/me | Sin parámetros ni cuerpo | Requiere JWT | 204: sin cuerpo |
| GET /profiles | Sin parámetros ni cuerpo | Sin guard JWT declarado | 200: arreglo de perfiles |
| GET /profiles/:id | Ruta: id (entero positivo) | Sin guard JWT declarado | 200: datos de perfil (objeto JSON) |

## Lectura

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| POST /bookmarks | JSON: CreateBookmarkDto | Requiere JWT | 201: objeto marcador devuelto por el servicio |
| GET /bookmarks | Query: FindBookmarksQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /bookmarks/:id | Ruta: id (entero positivo) | Requiere JWT | 200: datos de marcador (objeto JSON) |
| PATCH /bookmarks/:id | Ruta: id (entero positivo); JSON: UpdateBookmarkDto | Requiere JWT | 200: objeto marcador devuelto por el servicio |
| DELETE /bookmarks/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| GET /favorites | Query: PaginationQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| POST /favorites/:articleId | Ruta: articleId (entero positivo) | Requiere JWT | 201: objeto favorito devuelto por el servicio |
| DELETE /favorites/:articleId | Ruta: articleId (entero positivo) | Requiere JWT | 204: sin cuerpo |
| GET /progress | Query: PaginationQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /progress/:articleId | Ruta: articleId (entero positivo) | Requiere JWT | 200: datos de progreso de lectura (objeto JSON) |
| PUT /progress/:articleId | Ruta: articleId (entero positivo); JSON: SaveProgressDto | Requiere JWT | 200: objeto progreso de lectura devuelto por el servicio |
| DELETE /progress/:articleId | Ruta: articleId (entero positivo) | Requiere JWT | 204: sin cuerpo |
| POST /reading-lists | JSON: CreateReadingListDto | Requiere JWT | 201: objeto lista de lectura devuelto por el servicio |
| GET /reading-lists/mine | Sin parámetros ni cuerpo | Requiere JWT | 200: arreglo de listas de lectura |
| GET /reading-lists/profile/:profileId | Ruta: profileId (entero positivo) | Sin guard JWT declarado | 200: arreglo de listas de lectura |
| GET /reading-lists/:id | Ruta: id (entero positivo) | JWT opcional | 200: datos de lista de lectura (objeto JSON) |
| PATCH /reading-lists/:id | Ruta: id (entero positivo); JSON: UpdateReadingListDto | Requiere JWT | 200: objeto lista de lectura devuelto por el servicio |
| DELETE /reading-lists/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| POST /reading-lists/:id/items | Ruta: id (entero positivo); JSON: AddReadingListItemDto | Requiere JWT | 201: objeto lista de lectura devuelto por el servicio |
| PUT /reading-lists/:id/items/order | Ruta: id (entero positivo); JSON: ReorderReadingListItemsDto | Requiere JWT | 200: objeto lista de lectura devuelto por el servicio |
| DELETE /reading-lists/:id/items/:articleId | Ruta: id (entero positivo), articleId (entero positivo) | Requiere JWT | 204: sin cuerpo |

## Interacción social

| **Método y ruta** | **Parámetros y solicitud** | **Acceso** | **Respuesta exitosa** |
| --- | --- | --- | --- |
| POST /comments | JSON: CreateCommentDto | Requiere JWT | 201: objeto comentario devuelto por el servicio |
| GET /comments/article/:articleId | Ruta: articleId (entero positivo); Query: PaginationQueryDto | JWT opcional | 200: página {data, total, page, limit} |
| GET /comments/post/:postId | Ruta: postId (entero positivo); Query: PaginationQueryDto | JWT opcional | 200: página {data, total, page, limit} |
| PATCH /comments/:id | Ruta: id (entero positivo); JSON: UpdateCommentDto | Requiere JWT | 200: objeto comentario devuelto por el servicio |
| DELETE /comments/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| POST /posts | JSON: CreatePostDto | Requiere JWT | 201: objeto publicación devuelto por el servicio |
| GET /posts | Query: FindPostsQueryDto | JWT opcional | 200: página {data, total, page, limit} |
| GET /posts/mine | Query: PaginationQueryDto | Requiere JWT | 200: página {data, total, page, limit} |
| GET /posts/:id | Ruta: id (entero positivo) | JWT opcional | 200: datos de publicación (objeto JSON) |
| GET /posts/:id/replies | Ruta: id (entero positivo); Query: PaginationQueryDto | JWT opcional | 200: página {data, total, page, limit} |
| DELETE /posts/:id | Ruta: id (entero positivo) | Requiere JWT | 204: sin cuerpo |
| GET /reactions/:targetType/:targetId | Ruta: targetType (article, post o comment), targetId (entero positivo) | JWT opcional | 200: {total, byType, mine} |
| PUT /reactions/:targetType/:targetId | Ruta: targetType (article, post o comment), targetId (entero positivo); JSON: SetReactionDto | Requiere JWT | 200: objeto reacción devuelto por el servicio |
| DELETE /reactions/:targetType/:targetId | Ruta: targetType (article, post o comment), targetId (entero positivo) | Requiere JWT | 204: sin cuerpo |

Los códigos 200, 201 y 204 corresponden a respuestas exitosas configuradas en los controladores. Las respuestas de error dependen de la validación y de las reglas de negocio; entre las más comunes están 400 (solicitud inválida), 401 (JWT ausente, inválido o revocado), 403 (permiso insuficiente), 404 (recurso inexistente) y 409 (conflicto). En los endpoints marcados “sin guard JWT declarado”, el controlador no exige token; esta descripción refleja el código revisado.

## Campos principales de los DTO

| **DTO o consulta** | **Campos principales** | **DTO o consulta** | **Campos principales** |
| --- | --- | --- | --- |
| UserLoginDto | email; password | CreatePlanDto | name; price; currency; billingPeriod; communityId, isActive y authorId (opcionales) |
| CreateUserDto | email; password; phoneNumber (opcional); roleIds | UpdatePlanDto | name, price e isActive (opcionales) |
| UpdateUserDto | Campos de CreateUserDto opcionales; isActive (opcional) | FindPlansQueryDto | page; limit; authorId y communityId (opcionales) |
| CreateRoleDto | roleName; permissionIds (opcional) | CreateSubscriptionDto | planId; paymentMethod; paymentToken y autoRenew (opcionales) |
| CreatePermissionDto | permissionName | RenewSubscriptionDto | paymentMethod; paymentToken (opcional) |
| CreateProfileDto | username; name; profilePhoto, bio, website y socialLinks (opcionales) | FindPaymentsQueryDto | page; limit; subscriptionId (opcional) |
| CreatePreferenceDto | tags | FindNotificationsQueryDto | page; limit; unread y type (opcionales) |
| CreateArticleDto | title; content; description, isPremium, collectionId y communityId (opcionales) | CreateBookmarkDto | articleId; highlightedText; startPosition; endPosition; note (opcional) |
| FindArticlesQueryDto | page; limit; authorId, collectionId, communityId y tag (opcionales) | UpdateBookmarkDto | note (opcional) |
| UpdateArticleStatusDto | status: DRAFT, PUBLISHED o ARCHIVED | FindBookmarksQueryDto | page; limit; articleId (opcional) |
| CreateCollectionDto | title; description (opcional) | SaveProgressDto | percentage |
| CreateReviewDto | articleId; rating (1–5); reviewText (opcional) | CreateReadingListDto | name; status y visibility (opcionales) |
| ReplaceArticleTagsDto | tags (máximo 10) | AddReadingListItemDto | articleId |
| CreateCommunityDto | name; topic; description, isPremium y tags (opcionales) | ReorderReadingListItemsDto | articleIds |
| UpdateCommunityDto | Campos editables de CreateCommunityDto, excepto tags | CreatePostDto | postType, content, articleId, parentPostId, communityId y visibility (opcionales) |
| ReplaceCommunityTagsDto | tags | FindPostsQueryDto | page; limit; authorId y communityId (opcionales) |
| FindCommunitiesQueryDto | page; limit; topic, tag y search (opcionales) | CreateCommentDto | content; articleId, postId y parentCommentId según el destino |
| UpdateMembershipDto | role (MEMBER/MODERATOR) y status (ACTIVE/BANNED), opcionales | SetReactionDto | type: LIKE, LOVE o INSIGHTFUL |
| FindMembersQueryDto | page; limit; status (opcional) | FindCollectionsQueryDto | authorId (opcional) |