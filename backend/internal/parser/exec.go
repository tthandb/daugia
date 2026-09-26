package parser

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"
)

// ErrBadDocument marks failures caused by the uploaded file itself (the
// converter rejected it or produced implausible output), as opposed to a
// missing tool or a cancelled context.
var ErrBadDocument = errors.New("document could not be parsed")

const (
	maxToolOutput = 8 << 20
	maxToolStderr = 4 << 10
	toolWaitDelay = 2 * time.Second
)

// runTool executes an external converter with a bounded lifetime and a bounded
// amount of captured output. Converters only ever receive server-generated
// paths, so no argument escaping is needed; the risk is hostile input making
// them hang or flood memory.
func runTool(ctx context.Context, name string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.WaitDelay = toolWaitDelay
	// Converters may spawn children (node, shell wrappers); kill the whole
	// process group so a timeout cannot leave a grandchild holding the pipe.
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error { return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL) }
	cmd.Env = []string{"PATH=" + os.Getenv("PATH"), "HOME=" + os.TempDir(), "LANG=C.UTF-8"}
	var stderr bytes.Buffer
	cmd.Stderr = &limitedWriter{w: &stderr, remaining: maxToolStderr}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("%s: stdout pipe: %w", name, err)
	}
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("%s: start: %w", name, err)
	}

	out, readErr := io.ReadAll(io.LimitReader(stdout, maxToolOutput+1))
	if len(out) > maxToolOutput {
		_ = cmd.Cancel()
		_ = cmd.Wait()
		return nil, fmt.Errorf("%w: %s output exceeded %d bytes", ErrBadDocument, name, maxToolOutput)
	}
	waitErr := cmd.Wait()

	if ctxErr := ctx.Err(); ctxErr != nil {
		return nil, fmt.Errorf("%s: %w", name, ctxErr)
	}
	if readErr != nil {
		return nil, fmt.Errorf("%s: read output: %w", name, readErr)
	}
	if waitErr != nil {
		var exitErr *exec.ExitError
		if errors.As(waitErr, &exitErr) {
			log.Printf("%s exited with %v: %s", name, exitErr, strings.TrimSpace(stderr.String()))
			return nil, fmt.Errorf("%w: %s exit status %d", ErrBadDocument, name, exitErr.ExitCode())
		}
		return nil, fmt.Errorf("%s: %w", name, waitErr)
	}
	return out, nil
}

type limitedWriter struct {
	w         io.Writer
	remaining int
}

func (l *limitedWriter) Write(p []byte) (int, error) {
	if l.remaining <= 0 {
		return len(p), nil
	}
	if len(p) > l.remaining {
		_, err := l.w.Write(p[:l.remaining])
		l.remaining = 0
		return len(p), err
	}
	n, err := l.w.Write(p)
	l.remaining -= n
	return len(p), err
}
