package com.cctv.road.board.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.cctv.road.board.dto.BoardDTO;
import com.cctv.road.board.entity.PageList;
import com.cctv.road.board.entity.Reply;
import com.cctv.road.board.service.BoardService;
import com.cctv.road.board.service.ReplyService;
import com.cctv.road.member.entity.Member;
import com.cctv.road.member.security.CustomUserDetails;
import com.cctv.road.member.service.MemberService;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Controller
@RequestMapping("/board")
public class BoardController {

  private final BoardService boardService;
  private final MemberService memberService;
  private final ReplyService replyService;

  public BoardController(BoardService boardService, MemberService memberService, ReplyService replyService) {
    this.boardService = boardService;
    this.memberService = memberService;
    this.replyService = replyService;
  }

  @GetMapping("/write")
  public String writeForm(@RequestParam("categoryId") int categoryId, Model model) {
    BoardDTO boardDTO = new BoardDTO();
    boardDTO.setCategoryId(categoryId);
    model.addAttribute("categoryId", categoryId);
    model.addAttribute("boardDTO", boardDTO);
    return "board/write";
  }

  @PostMapping("/write")
  public String writeSubmit(@ModelAttribute BoardDTO boardDTO,
      @AuthenticationPrincipal CustomUserDetails userDetails) {
    log.info("🔥 글쓰기 요청 받음");
    log.info("🔎 notice: {}", boardDTO.isNotice());
    if (userDetails == null) {
      return "redirect:/login";
    }
    Member member = userDetails.getMember();
    boardDTO.setNickName(member.getNickName());

    boardService.writeBoard(boardDTO, member.getUserId());

    return "redirect:/board/list?categoryId=" + boardDTO.getCategoryId();
  }

  @GetMapping("/list")
  public String list(@RequestParam(name = "categoryId", required = false, defaultValue = "2") int categoryId,
      @RequestParam(name = "currentPage", defaultValue = "1") int currentPage,
      Model model) {

        List<BoardDTO> notices = boardService.getNoticeList();

    int totalCount = boardService.getTotalCountByCategory(categoryId);
    PageList pageList = new PageList(totalCount, currentPage, 10);
    List<BoardDTO> posts = boardService.getPagedPosts(categoryId, pageList.getStartNo(), pageList.getPageSize());

    String categoryName = switch (categoryId) {
      case 2 -> "자유게시판";
      case 3 -> "민원게시판";
      default -> "게시판";
    };

    model.addAttribute("notices", notices);
    model.addAttribute("posts", posts);
    model.addAttribute("categoryId", categoryId);
    model.addAttribute("categoryName", categoryName);
    model.addAttribute("pageList", pageList);
    model.addAttribute("currentPage", currentPage);

    return "board/list";
  }

  @GetMapping("/view/{boardNum}")
  public String viewPost(@PathVariable("boardNum") Integer boardNum,
      @RequestParam(name = "currentPage", defaultValue = "1") int currentPage,
      Model model) {

    boardService.increaseHit(boardNum);
    BoardDTO post = boardService.getBoard(boardNum);
    List<Reply> replies = replyService.getReplies(post.getBoardNum());

    model.addAttribute("post", post);
    model.addAttribute("currentPage", currentPage);
    model.addAttribute("replies", replies);

    return "board/view";
  }

  @GetMapping("/delete/{boardNum}")
  @Transactional
  public String deletePost(@PathVariable("boardNum") int boardNum,
      @RequestParam(name = "currentPage", defaultValue = "1") int currentPage,
      RedirectAttributes redirectAttributes) {

    BoardDTO post = boardService.getBoard(boardNum);
    boardService.deletePostWithReplies(boardNum); // ✅ 수정된 부분

    redirectAttributes.addAttribute("categoryId", post.getCategoryId());
    redirectAttributes.addAttribute("currentPage", currentPage);
    return "redirect:/board/list";
  }

  // ✅ boardNum이 아닌 boardSeq 기반으로 조회
  @GetMapping("/update/{categoryId}/{boardSeq}")
  public String showUpdateForm(@PathVariable("categoryId") int categoryId,
      @PathVariable("boardSeq") int boardSeq,
      @RequestParam(name = "currentPage", defaultValue = "1") int currentPage,
      Model model) {
    BoardDTO post = boardService.getBoardBySeq(categoryId, boardSeq);
    if (post == null) {
      throw new IllegalArgumentException("해당 게시글이 존재하지 않습니다.");
    }

    model.addAttribute("post", post);
    model.addAttribute("currentPage", currentPage);
    return "board/update";
  }

  // ✅ boardNum이 아닌 boardSeq로 업데이트 처리
  @PostMapping("/update/{categoryId}/{boardSeq}")
  public String updatePost(@PathVariable("categoryId") int categoryId,
      @PathVariable("boardSeq") int boardSeq,
      @ModelAttribute BoardDTO boardDTO,
      @RequestParam(name = "currentPage", defaultValue = "1") int currentPage,
      RedirectAttributes redirectAttributes) {

        log.info("🔄 수정 요청 받은 notice: {}", boardDTO.isNotice());
    boardService.updatePostBySeq(categoryId, boardSeq, boardDTO);

    BoardDTO updated = boardService.getBoardBySeq(categoryId, boardSeq);
    redirectAttributes.addAttribute("currentPage", currentPage);

    return "redirect:/board/view/" + updated.getBoardNum();
  }
}
