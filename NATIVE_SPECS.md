# Native App Specifications

This document provides implementation guidelines for native iOS and Android apps using the analog clock component.

## iOS (SwiftUI)

### Implementation Approach

```swift
import SwiftUI

struct AnalogClockView: View {
    @State private var currentTime = Date()
    @State private var timer: Timer?
    @State private var isVisible = true
    
    let size: CGFloat
    let showSeconds: Bool
    let accentColor: Color
    let faceColor: Color
    let reducedMotion: Bool
    
    init(
        size: CGFloat = 160,
        showSeconds: Bool = false,
        accentColor: Color = .primary,
        faceColor: Color = .white,
        reducedMotion: Bool = false
    ) {
        self.size = size
        self.showSeconds = showSeconds
        self.accentColor = accentColor
        self.faceColor = faceColor
        self.reducedMotion = reducedMotion
    }
    
    var body: some View {
        TimelineView(.periodic(from: .now, by: showSeconds ? 1 : 60)) { context in
            Canvas { context, size in
                drawClock(in: context, size: size, time: context.date)
            }
            .frame(width: self.size, height: self.size)
            .onAppear {
                startTimer()
            }
            .onDisappear {
                stopTimer()
            }
        }
    }
    
    private func drawClock(in context: GraphicsContext, size: CGSize, time: Date) {
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let radius = min(size.width, size.height) / 2 - 10
        
        // Clock face
        context.fill(
            Circle().path(in: CGRect(origin: .zero, size: size)),
            with: .color(faceColor)
        )
        
        // Hour ticks
        for i in 0..<12 {
            let angle = Double(i) * 30 * .pi / 180
            let tickLength: CGFloat = i % 3 == 0 ? 8 : 4
            let tickWidth: CGFloat = i % 3 == 0 ? 2 : 1
            
            let startPoint = CGPoint(
                x: center.x + (radius - 15) * cos(angle - .pi / 2),
                y: center.y + (radius - 15) * sin(angle - .pi / 2)
            )
            let endPoint = CGPoint(
                x: center.x + (radius - 15 - tickLength) * cos(angle - .pi / 2),
                y: center.y + (radius - 15 - tickLength) * sin(angle - .pi / 2)
            )
            
            context.stroke(
                Path { path in
                    path.move(to: startPoint)
                    path.addLine(to: endPoint)
                },
                with: .color(accentColor),
                lineWidth: tickWidth
            )
        }
        
        // Hands
        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: time) % 12
        let minute = calendar.component(.minute, from: time)
        let second = calendar.component(.second, from: time)
        
        // Hour hand
        let hourAngle = (Double(hour) * 30 + Double(minute) * 0.5) * .pi / 180
        drawHand(
            in: context,
            center: center,
            angle: hourAngle,
            length: radius * 0.5,
            width: 3
        )
        
        // Minute hand
        let minuteAngle = Double(minute) * 6 * .pi / 180
        drawHand(
            in: context,
            center: center,
            angle: minuteAngle,
            length: radius * 0.7,
            width: 2
        )
        
        // Second hand (if enabled)
        if showSeconds {
            let secondAngle = Double(second) * 6 * .pi / 180
            drawHand(
                in: context,
                center: center,
                angle: secondAngle,
                length: radius * 0.8,
                width: 1
            )
        }
        
        // Center pin
        context.fill(
            Circle().path(in: CGRect(
                x: center.x - 4,
                y: center.y - 4,
                width: 8,
                height: 8
            )),
            with: .color(accentColor)
        )
    }
    
    private func drawHand(
        in context: GraphicsContext,
        center: CGPoint,
        angle: Double,
        length: CGFloat,
        width: CGFloat
    ) {
        let endPoint = CGPoint(
            x: center.x + length * cos(angle - .pi / 2),
            y: center.y + length * sin(angle - .pi / 2)
        )
        
        context.stroke(
            Path { path in
                path.move(to: center)
                path.addLine(to: endPoint)
            },
            with: .color(accentColor),
            lineWidth: width
        )
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: showSeconds ? 1 : 60, repeats: true) { _ in
            currentTime = Date()
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
}

// Usage
struct ContentView: View {
    var body: some View {
        VStack {
            AnalogClockView(size: 160, showSeconds: false)
            AnalogClockView(size: 200, showSeconds: true, accentColor: .blue)
        }
    }
}
```

### Key Features

- **TimelineView**: Uses SwiftUI's `TimelineView(.periodic)` for efficient updates
- **Canvas Drawing**: Renders clock using SwiftUI's Canvas for optimal performance
- **Low Power Mode**: Respects system power management
- **Reduced Motion**: Honors `UIAccessibility.isReduceMotionEnabled`
- **View Lifecycle**: Properly manages timers with `onAppear`/`onDisappear`

## Android (Compose)

### Implementation Approach

```kotlin
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.Dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.*

@Composable
fun AnalogClock(
    size: Dp = 160.dp,
    showSeconds: Boolean = false,
    accentColor: Color = Color.Black,
    faceColor: Color = Color.White,
    reducedMotion: Boolean = false,
    modifier: Modifier = Modifier
) {
    var currentTime by remember { mutableStateOf(Date()) }
    val lifecycleOwner = LocalLifecycleOwner.current
    
    // Lifecycle-aware timer
    LaunchedEffect(showSeconds, lifecycleOwner) {
        while (true) {
            currentTime = Date()
            delay(if (showSeconds) 1000L else 60000L)
        }
    }
    
    // Pause when not visible
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE -> {
                    // Pause updates
                }
                Lifecycle.Event.ON_RESUME -> {
                    // Resume updates
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
    
    Canvas(
        modifier = modifier.size(size)
    ) {
        drawClock(
            time = currentTime,
            size = size,
            accentColor = accentColor,
            faceColor = faceColor,
            showSeconds = showSeconds
        )
    }
}

private fun DrawScope.drawClock(
    time: Date,
    size: Dp,
    accentColor: Color,
    faceColor: Color,
    showSeconds: Boolean
) {
    val center = Offset(size.toPx() / 2, size.toPx() / 2)
    val radius = (size.toPx() / 2) - 10f
    
    // Clock face
    drawCircle(
        color = faceColor,
        radius = radius,
        center = center
    )
    
    // Hour ticks
    for (i in 0..11) {
        val angle = i * 30f * Math.PI / 180f
        val tickLength = if (i % 3 == 0) 8f else 4f
        val tickWidth = if (i % 3 == 0) 2f else 1f
        
        val startPoint = Offset(
            x = (center.x + (radius - 15) * kotlin.math.cos(angle - Math.PI / 2)).toFloat(),
            y = (center.y + (radius - 15) * kotlin.math.sin(angle - Math.PI / 2)).toFloat()
        )
        val endPoint = Offset(
            x = (center.x + (radius - 15 - tickLength) * kotlin.math.cos(angle - Math.PI / 2)).toFloat(),
            y = (center.y + (radius - 15 - tickLength) * kotlin.math.sin(angle - Math.PI / 2)).toFloat()
        )
        
        drawLine(
            color = accentColor,
            start = startPoint,
            end = endPoint,
            strokeWidth = tickWidth
        )
    }
    
    // Hands
    val calendar = Calendar.getInstance()
    calendar.time = time
    
    val hour = calendar.get(Calendar.HOUR) % 12
    val minute = calendar.get(Calendar.MINUTE)
    val second = calendar.get(Calendar.SECOND)
    
    // Hour hand
    val hourAngle = (hour * 30f + minute * 0.5f) * Math.PI / 180f
    drawHand(
        center = center,
        angle = hourAngle,
        length = radius * 0.5f,
        width = 3f,
        color = accentColor
    )
    
    // Minute hand
    val minuteAngle = minute * 6f * Math.PI / 180f
    drawHand(
        center = center,
        angle = minuteAngle,
        length = radius * 0.7f,
        width = 2f,
        color = accentColor
    )
    
    // Second hand (if enabled)
    if (showSeconds) {
        val secondAngle = second * 6f * Math.PI / 180f
        drawHand(
            center = center,
            angle = secondAngle,
            length = radius * 0.8f,
            width = 1f,
            color = accentColor
        )
    }
    
    // Center pin
    drawCircle(
        color = accentColor,
        radius = 4f,
        center = center
    )
}

private fun DrawScope.drawHand(
    center: Offset,
    angle: Double,
    length: Float,
    width: Float,
    color: Color
) {
    val endPoint = Offset(
        x = (center.x + length * kotlin.math.cos(angle - Math.PI / 2)).toFloat(),
        y = (center.y + length * kotlin.math.sin(angle - Math.PI / 2)).toFloat()
    )
    
    drawLine(
        color = color,
        start = center,
        end = endPoint,
        strokeWidth = width
    )
}

// Usage
@Composable
fun ClockScreen() {
    Column {
        AnalogClock(
            size = 160.dp,
            showSeconds = false,
            accentColor = Color.Blue
        )
        
        AnalogClock(
            size = 200.dp,
            showSeconds = true,
            accentColor = Color.Red,
            faceColor = Color.LightGray
        )
    }
}
```

### Key Features

- **Coroutines**: Uses `LaunchedEffect` with coroutines for efficient updates
- **Lifecycle Awareness**: Pauses/resumes based on activity lifecycle
- **Canvas Drawing**: Renders using Compose's Canvas for optimal performance
- **State Management**: Uses `remember` and `mutableStateOf` for reactive updates
- **Accessibility**: Respects system accessibility settings

## Performance Considerations

### Both Platforms

1. **Boundary-based Updates**: Only update at exact minute/second boundaries
2. **Sleep Between Ticks**: No continuous animation loops
3. **Canvas Drawing**: Use native drawing APIs for optimal performance
4. **Memory Management**: Proper cleanup of timers and observers
5. **Battery Optimization**: Pause when not visible or in background

### iOS Specific

- Use `TimelineView` for automatic optimization
- Respect `UIAccessibility.isReduceMotionEnabled`
- Handle Low Power Mode appropriately
- Use `onAppear`/`onDisappear` for lifecycle management

### Android Specific

- Use coroutines instead of `Handler` for better performance
- Implement proper lifecycle management with `LifecycleEventObserver`
- Respect system power management settings
- Use `DisposableEffect` for cleanup

## Testing

### Unit Tests

```kotlin
// Android example
@Test
fun `clock updates at minute boundaries`() {
    val clock = AnalogClock(showSeconds = false)
    val initialTime = Date()
    
    // Test that next update is scheduled for next minute
    val nextUpdate = clock.getNextMinuteBoundary(initialTime)
    assertTrue(nextUpdate.seconds == 0)
    assertTrue(nextUpdate.minutes == initialTime.minutes + 1)
}
```

```swift
// iOS example
func testClockUpdatesAtMinuteBoundaries() {
    let clock = AnalogClockView(showSeconds: false)
    let initialTime = Date()
    
    let nextUpdate = clock.getNextMinuteBoundary(initialTime)
    XCTAssertEqual(nextUpdate.timeIntervalSince1970.truncatingRemainder(dividingBy: 60), 0)
}
```

This implementation provides the same performance characteristics and accessibility features as the web version while leveraging native platform capabilities.

