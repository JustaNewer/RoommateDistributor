import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Profile from '../views/Profile.vue'
import CreatedDorms from '../views/CreatedDorms.vue'
import JoinedDorms from '../views/JoinedDorms.vue'
import PersonalityTest from '../views/PersonalityTest.vue'
import DormDetail from '../views/DormDetail.vue'
import SearchResults from '../views/SearchResults.vue'
import i18n from '../i18n'

// 生成支持语言前缀的路由
function makeRoutes(prefix = '') {
    const lang = prefix === '/en' ? 'en' : 'zh'
    const suffix = lang === 'en' ? 'En' : ''
    return [
        {
            path: `${prefix}/`,
            name: `Home${suffix}`,
            component: Home,
            meta: { requiresAuth: true, lang }
        },
        {
            path: `${prefix}/home`,
            redirect: `${prefix}/`
        },
        {
            path: `${prefix}/login`,
            name: `Login${suffix}`,
            component: Login,
            meta: { requiresGuest: true, lang }
        },
        {
            path: `${prefix}/profile`,
            name: `Profile${suffix}`,
            component: Profile,
            meta: { requiresAuth: true, lang }
        },
        {
            path: `${prefix}/created-dorms`,
            name: `CreatedDorms${suffix}`,
            component: CreatedDorms,
            meta: { requiresAuth: true, lang, roles: ['admin', 'super_account'] }
        },
        {
            path: `${prefix}/joined-dorms`,
            name: `JoinedDorms${suffix}`,
            component: JoinedDorms,
            meta: { requiresAuth: true, lang, roles: ['resident', 'super_account'] }
        },
        {
            path: `${prefix}/personality-test`,
            name: `PersonalityTest${suffix}`,
            component: PersonalityTest,
            meta: { requiresAuth: true, lang, roles: ['resident', 'super_account'] }
        },
        {
            path: `${prefix}/dorm/:id`,
            name: `DormDetail${suffix}`,
            component: DormDetail,
            meta: { requiresAuth: true, lang }
        },
        {
            path: `${prefix}/search-results`,
            name: `SearchResults${suffix}`,
            component: SearchResults,
            meta: { requiresAuth: true, lang }
        },
    ]
}

const routes = [
    // 中文路由（默认，无前缀）
    ...makeRoutes(''),
    // 英文路由（/en 前缀）
    ...makeRoutes('/en'),
    // 兜底重定向
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 导航守卫：同步语言 + 权限校验
router.beforeEach((to, from, next) => {
    // 同步语言
    const lang = to.meta.lang || 'zh'
    if (i18n.global.locale !== lang) {
        i18n.global.locale = lang
        localStorage.setItem('locale', lang)
    }

    const isAuthenticated = localStorage.getItem('userId')

    if (to.meta.requiresAuth && !isAuthenticated) {
        const loginPath = lang === 'en' ? '/en/login' : '/login'
        next({ path: loginPath, query: { redirect: to.fullPath } })
        return
    }

    if (to.meta.requiresGuest && isAuthenticated) {
        next(lang === 'en' ? '/en/' : '/')
        return
    }

    // 角色权限检查
    if (to.meta.roles && isAuthenticated) {
        const userRole = localStorage.getItem('userRole') || 'resident'
        if (!to.meta.roles.includes(userRole)) {
            next(lang === 'en' ? '/en/' : '/')
            return
        }
    }

    next()
})

export default router
