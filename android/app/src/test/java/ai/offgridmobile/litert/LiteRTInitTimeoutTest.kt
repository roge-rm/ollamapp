package ai.offgridmobile.litert

import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * tryInitBackend used to wrap blocking Engine.initialize() as
 * withTimeout { withContext(IO) { initialize() } }. The timeout cancelled the waiter
 * and closed the engine while native init was still in clFinish. Timing the call after
 * it returns keeps close() on a finished attempt.
 */
@Suppress("kotlin:S100")
class LiteRTInitTimeoutTest {

    @Test
    fun `a timeout waits for the blocking init to return before throwing`() {
        val finished = AtomicBoolean(false)
        try {
            runBlocking {
                LiteRTModule.runBlockingInitOnIo(50) {
                    Thread.sleep(150)
                    finished.set(true)
                }
            }
            fail("expected InitTimeoutException")
        } catch (_: InitTimeoutException) {
            assertTrue(
                "initialize() must finish before the timeout is delivered to the caller",
                finished.get(),
            )
        }
    }
}
